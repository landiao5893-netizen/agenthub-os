"use client";

import { useEffect, useState, useRef } from "react";
import { runtimeEngine } from "@/lib/runtime-engine";
import { AgentRuntimeState } from "@/types";

export function useRuntime(agentId: string | null) {
  const [state, setState] = useState<AgentRuntimeState | null>(
    agentId ? runtimeEngine.getState(agentId) ?? null : null
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!agentId) {
      setState(null);
      return;
    }

    // 立即获取当前状态
    setState(runtimeEngine.getState(agentId) ?? null);

    // rAF 节流订阅
    let pending = false;
    const unsub = runtimeEngine.subscribe((states) => {
      if (!pending) {
        pending = true;
        rafRef.current = requestAnimationFrame(() => {
          const s = states.get(agentId);
          if (s) setState({ ...s });
          pending = false;
        });
      }
    });

    return () => {
      unsub();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [agentId]);

  return state;
}

/** 启动全局 Runtime 引擎 */
export function useRuntimeEngine() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      runtimeEngine.start();
      setReady(true);
    }, 2000);
    return () => {
      clearTimeout(timer);
      runtimeEngine.stop();
    };
  }, []);

  return ready;
}
