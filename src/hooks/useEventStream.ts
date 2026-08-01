"use client";

import { useEffect, useRef, useState } from "react";
import {
  mockEventStream,
  IEventStream,
  WsMessage,
} from "@/lib/event-engine";
import { useAgentStore } from "@/stores/agentStore";
import { useChatStore } from "@/stores/chatStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { AgentInternalStatus, ChatMessage, EventLog } from "@/types";

// ============================================
// Hook: useEventStream
// 接入 Mock 引擎或未来真实 WebSocket
// 切换方式：改 import 即可
// ============================================
export function useEventStream() {
  const [connected, setConnected] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<IEventStream>(mockEventStream);

  // 改为真实 WS 时替换：
  // import { createRealWebSocket } from "@/lib/event-engine";
  // streamRef.current = createRealWebSocket("wss://your-server.com");

  useEffect(() => {
    const stream = streamRef.current;

    // rAF 批处理队列
    let rafId: number | null = null;
    const queue: WsMessage[] = [];

    const flushQueue = () => {
      const batch = queue.splice(0);
      batch.forEach(dispatchToStores);
      rafId = null;
    };

    stream.onOpen(() => setConnected(true));
    stream.onClose(() => setConnected(false));

    const unsub = stream.onMessage((msg: WsMessage) => {
      queue.push(msg);
      if (rafId === null) {
        rafId = requestAnimationFrame(flushQueue);
      }
    });

    stream.start();
    cleanupRef.current = () => {
      stream.stop();
      unsub();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return { connected };
}

// ============================================
// 消息分发
// ============================================
function dispatchToStores(msg: WsMessage) {
  const { type, payload } = msg;
  const ts = msg.timestamp;

  switch (type) {
    case "agent.status": {
      useAgentStore.getState().updateAgentStatus(
        payload.agentId as string,
        payload.status as AgentInternalStatus
      );
      break;
    }
    case "agent.progress": {
      useAgentStore.getState().updateAgentProgress(
        payload.agentId as string,
        payload.progress as number
      );
      break;
    }
    case "agent.task": {
      const agentId = payload.agentId as string;
      const runtimes = new Map(useAgentStore.getState().runtimes);
      const existing = runtimes.get(agentId);
      if (existing) {
        runtimes.set(agentId, {
          ...existing,
          currentTask: payload.task as string,
          lastActive: new Date(),
        });
        useAgentStore.setState({ runtimes });
      }
      break;
    }
    case "workflow.node": {
      useWorkflowStore.getState().updateNodeStatus(
        payload.nodeId as string,
        payload.status as "pending" | "active" | "completed" | "error",
        payload.progress as number
      );
      break;
    }
    case "event.log": {
      useWorkflowStore.getState().addEventLog({
        id: `log-${ts}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(ts),
        agentId: payload.agentId as string,
        event: payload.event as string,
        detail: payload.detail as string,
        level: (payload.level as EventLog["level"]) ?? "info",
      });
      break;
    }
    case "chat.message": {
      const p = payload as Record<string, unknown>;
      useChatStore.getState().addMessage({
        id: p.id as string,
        agentId: p.agentId as string,
        content: p.content as string,
        type: (p.type as ChatMessage["type"]) ?? "text",
        timestamp: new Date(p.timestamp as string),
        toolName: p.toolName as string | undefined,
        toolResult: p.toolResult as string | undefined,
      });
      break;
    }
    case "connection.ping":
      break;
  }
}
