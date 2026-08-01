"use client";

import { useAgentStore } from "@/stores/agentStore";
import { useUIStore } from "@/stores/uiStore";
import { StatusDot } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { Plus, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { getAgentProfile } from "@/lib/agent-profiles";

export function AgentTeam() {
  const { agents, runtimes, selectedAgentId, selectAgent } = useAgentStore();
  const { openChat, openSideChat, setMobileTab, setCreateDialogOpen } = useUIStore();

  const handleAgentClick = (agentId: string) => {
    selectAgent(agentId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      openChat(agentId);
      setMobileTab("chat");
    } else {
      openSideChat(agentId);
    }
  };

  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ah-text-muted">AI 团队</h3>
          <p className="text-[10px] text-ah-text-disabled mt-0.5">{agents.length} 位员工就绪</p>
        </div>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-ah-accent-purple/10 text-ah-accent-purple border border-ah-accent-purple/20 hover:bg-ah-accent-purple/20 transition-colors"
        >
          <Plus size={11} />创建
        </button>
      </div>

      {agents.map((agent) => {
        const runtime = runtimes.get(agent.id);
        const profile = getAgentProfile(agent.id);
        const status = runtime?.internalStatus ?? "IDLE";
        const isSelected = selectedAgentId === agent.id;
        const isActive = status !== "IDLE" && status !== "DONE";

        const statusDotMap: Record<string, "idle" | "thinking" | "working" | "done" | "error"> = {
          IDLE: "idle", THINKING: "thinking", WORKING: "working", TOOL_CALL: "working",
          WAITING: "idle", DONE: "done", ERROR: "error",
        };

        const statusLabel: Record<string, string> = {
          IDLE: "就绪", THINKING: "思考中", WORKING: "工作中", TOOL_CALL: "调用工具",
          WAITING: "等待中", DONE: "完成", ERROR: "异常",
        };

        return (
          <motion.div
            key={agent.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAgentClick(agent.id)}
            onTouchEnd={() => handleAgentClick(agent.id)}
            className={cn(
              "relative p-3 rounded-2xl cursor-pointer transition-all duration-300 border group",
              isSelected
                ? "bg-white/[0.05] border-purple-500/25 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                : "bg-white/[0.015] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03]"
            )}
          >
            {/* 选中光晕 */}
            {isSelected && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 pointer-events-none" />
            )}

            <div className="relative flex items-start gap-3">
              {/* 头像 */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl border"
                  style={{
                    backgroundColor: `${agent.color}15`,
                    borderColor: `${agent.color}30`,
                    boxShadow: isActive ? `0 0 16px ${agent.color}30` : "none",
                  }}
                >
                  {agent.avatar}
                </div>
                {isActive && (
                  <div className="absolute -inset-0.5 rounded-2xl animate-glow-pulse opacity-30"
                    style={{ background: agent.color }} />
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-ah-text-primary truncate">{agent.name}</span>
                  <StatusDot status={statusDotMap[status] ?? "idle"} size="sm" />
                </div>
                <p className="text-[10px] text-ah-text-muted mt-0.5">
                  {profile?.title ?? agent.roleLabel} · {profile?.department ?? ""}
                </p>

                {/* 状态文案 */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md border"
                    style={{
                      color: isActive ? agent.color : "#71717a",
                      backgroundColor: isActive ? `${agent.color}12` : "transparent",
                      borderColor: isActive ? `${agent.color}25` : "rgba(255,255,255,0.05)",
                    }}>
                    {statusLabel[status]}
                  </span>
                  {runtime?.currentTask && (
                    <span className="text-[9px] text-ah-text-disabled truncate">{runtime.currentTask}</span>
                  )}
                </div>

                {/* 能力标签 */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.skills.slice(0, 2).map(s => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.04] text-ah-text-disabled">
                      {s}
                    </span>
                  ))}
                  {agent.skills.length > 2 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.04] text-ah-text-disabled">
                      +{agent.skills.length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* 箭头 */}
              <ChevronRight size={14} className="text-white/[0.08] group-hover:text-white/[0.2] transition-colors mt-1 shrink-0" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
