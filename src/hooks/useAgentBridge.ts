"use client";

import { useEffect, useRef } from "react";
import { adapterRegistry } from "@/adapters/registry";
import { AdapterEvent } from "@/adapters/base";
import { useAgentStore } from "@/stores/agentStore";
import { useChatStore } from "@/stores/chatStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { AgentInternalStatus, ChatMessage, EventLog } from "@/types";

// ============================================
// AgentBridge — 连接 Adapter 层到 Zustand Stores
// 所有 Adapter 事件通过这里分发到 UI
// ============================================

export function useAgentBridge() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 为每个 Agent 初始化 Adapter
    const agentIds = ["controller", "research-1", "content-1", "design-1", "dev-1", "reviewer-1"];

    agentIds.forEach(async (agentId) => {
      const adapter = await adapterRegistry.getAdapter(agentId);
      if (!adapter) return;

      // 监听 Adapter 事件 → 分发到 Stores
      adapter.onEvent((event: AdapterEvent) => {
        handleAdapterEvent(event, agentId);
      });
    });

    return () => {
      adapterRegistry.shutdownAll();
    };
  }, []);
}

// ============================================
// 事件分发
// ============================================
function handleAdapterEvent(event: AdapterEvent, agentId: string) {
  const { type, payload } = event;

  switch (type) {
    case "status_change": {
      const statusMap: Record<string, AgentInternalStatus> = {
        IDLE: "IDLE", THINKING: "THINKING", PLANNING: "THINKING",
        WORKING: "WORKING", TOOL_CALL: "TOOL_CALL",
        WAITING: "WAITING", COMPLETED: "DONE", ERROR: "ERROR",
      };
      const status = statusMap[payload.status ?? "IDLE"] ?? "IDLE";
      useAgentStore.getState().updateAgentStatus(agentId, status);
      if (payload.progress !== undefined) {
        useAgentStore.getState().updateAgentProgress(agentId, payload.progress);
      }
      break;
    }

    case "log_entry": {
      if (payload.logEntry) {
        const log: EventLog = {
          id: `adapter-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          timestamp: new Date(event.timestamp),
          agentId,
          event: payload.logEntry.message,
          detail: payload.logEntry.message,
          level: payload.logEntry.level === "debug" ? "info" : payload.logEntry.level,
        };
        useWorkflowStore.getState().addEventLog(log);
      }
      break;
    }

    case "tool_call": {
      if (payload.toolCall) {
        const msg: ChatMessage = {
          id: `adapter-msg-${Date.now()}`,
          agentId,
          content: payload.toolCall.input,
          type: "tool_call",
          timestamp: new Date(event.timestamp),
          toolName: payload.toolCall.toolName,
          toolResult: payload.toolCall.output,
        };
        useChatStore.getState().addMessage(msg);
      }
      break;
    }

    case "task_completed": {
      useAgentStore.getState().updateAgentStatus(agentId, "DONE");
      useAgentStore.getState().updateAgentProgress(agentId, 100);
      break;
    }
  }
}

// ============================================
// 便捷方法：通过 Adapter 发送任务
// ============================================
export async function dispatchTask(agentId: string, title: string, description: string, input: string) {
  const adapter = await adapterRegistry.getAdapter(agentId);
  if (!adapter) return;
  await adapter.sendTask({
    taskId: `task-${Date.now()}`,
    title,
    description,
    input,
    priority: "medium",
  });
}
