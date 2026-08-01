"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, MessageCircle, Send, Wrench, ChevronRight } from "lucide-react";
import { useAgentStore } from "@/stores/agentStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

export interface WorkStep {
  label: string;
  time: string;
  status: "done" | "active" | "waiting";
}

export interface WorkCardData {
  agentId: string;
  percentage: number;
  eta: string;
  steps: WorkStep[];
}

const HUMAN_AVATARS: Record<string, { initials: string; bg: string; color: string; displayName: string; role: string }> = {
  controller: { initials: "Co", bg: "linear-gradient(135deg,#6d5dfc,#9b6dff)", color: "#8b5cf6", displayName: "Controller", role: "主控项目经理" },
  "research-1": { initials: "Re", bg: "linear-gradient(135deg,#2563eb,#38bdf8)", color: "#3b82f6", displayName: "Research", role: "研究员" },
  "content-1": { initials: "Ct", bg: "linear-gradient(135deg,#0891b2,#22d3ee)", color: "#06b6d4", displayName: "Content", role: "内容创作者" },
  "design-1": { initials: "Ds", bg: "linear-gradient(135deg,#d97706,#fbbf24)", color: "#f59e0b", displayName: "Design", role: "视觉设计师" },
  "dev-1": { initials: "Dv", bg: "linear-gradient(135deg,#059669,#34d399)", color: "#10b981", displayName: "Developer", role: "开发工程师" },
  "reviewer-1": { initials: "Rv", bg: "linear-gradient(135deg,#e11d48,#fb7185)", color: "#f43f5e", displayName: "Reviewer", role: "质量审核员" },
};

const STATUS = {
  IDLE: { text: "在线", color: "#10b981" },
  THINKING: { text: "思考中", color: "#8b5cf6" },
  WORKING: { text: "执行中", color: "#3b82f6" },
  TOOL_CALL: { text: "调用工具", color: "#06b6d4" },
  WAITING: { text: "等待协作", color: "#f59e0b" },
  DONE: { text: "完成", color: "#10b981" },
  ERROR: { text: "异常", color: "#f43f5e" },
} as const;

export function AgentWorkCard({ card }: { card: WorkCardData }) {
  const { agents, runtimes, selectAgent } = useAgentStore();
  const { openChat, openSideChat, openAgentSettings } = useUIStore();
  const runtime = runtimes.get(card.agentId);
  const agent = agents.find((item) => item.id === card.agentId);
  const status = runtime?.internalStatus ?? "IDLE";
  const statusMeta = STATUS[status] ?? STATUS.IDLE;
  const preset = HUMAN_AVATARS[card.agentId];
  const color = preset?.color ?? agent?.color ?? "#8b5cf6";
  const toolSteps = card.steps.slice(0, 3);
  const currentTask = runtime?.currentTask ?? (status === "IDLE" ? "等待任务" : "处理中");
  const displayName = preset?.displayName ?? agent?.name ?? card.agentId;
  const role = preset?.role ?? agent?.roleLabel ?? "AI 员工";
  const avatarText = preset?.initials ?? agent?.avatar ?? "AI";
  const avatarBg = preset?.bg ?? `linear-gradient(135deg,${color},#60a5fa)`;

  const isMobileViewport = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const openAgentProfile = () => {
    selectAgent(card.agentId);
    openAgentSettings(card.agentId);
  };

  const openAgentChat = (event?: React.MouseEvent | React.TouchEvent) => {
    event?.stopPropagation();
    selectAgent(card.agentId);
    if (isMobileViewport()) openChat(card.agentId);
    else openSideChat(card.agentId);
  };

  const handleCardTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-agent-chat-action="true"]')) return;
    openAgentProfile();
  };

  return (
    <motion.article
      data-agent-id={card.agentId}
      role="button"
      tabIndex={0}
      whileTap={{ scale: 0.99 }}
      onClick={openAgentProfile}
      onTouchEnd={handleCardTouchEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") openAgentProfile();
      }}
      className="group min-h-[172px] cursor-pointer rounded-lg border border-white/[0.055] bg-[#111116]/72 p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-colors hover:border-white/[0.12] hover:bg-[#14141b]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: avatarBg }}>
              {avatarText}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111116]" style={{ backgroundColor: statusMeta.color }} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-white/90">{displayName}</div>
            <div className="truncate text-[10px] text-white/32">{role}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border px-2 py-0.5 text-[9px]" style={{ color: statusMeta.color, borderColor: `${statusMeta.color}33`, backgroundColor: `${statusMeta.color}12` }}>
            {statusMeta.text}
          </span>
          <ChevronRight size={14} className="text-white/10 transition-colors group-hover:text-white/25" />
        </div>
      </div>

      <div className="mt-2 rounded-md border border-white/[0.045] bg-black/18 px-2.5 py-1.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[10px] text-white/62">{currentTask}</span>
          <span className="font-mono text-[10px] text-white/40">{card.percentage}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${card.percentage}%` }}
            transition={{ duration: 0.55 }}
          />
        </div>
      </div>

      <div className="mt-2">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-white/35">
          <Wrench size={11} />
          <span>工具步骤</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {toolSteps.map((step) => (
            <div key={`${step.label}-${step.time}`} className="flex min-w-0 items-center gap-1 rounded-md bg-white/[0.018] px-1.5 py-1">
              {step.status === "done" ? (
                <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
              ) : step.status === "active" ? (
                <span className="h-3 w-3 shrink-0 rounded-full border-2 animate-pulse" style={{ borderColor: color }} />
              ) : (
                <Circle size={12} className="shrink-0 text-white/12" />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[10px]",
                  step.status === "active" ? "text-white/78" : step.status === "done" ? "text-white/38" : "text-white/18"
                )}
              >
                {step.label}
              </span>
              <span className="hidden shrink-0 font-mono text-[9px] text-white/20 2xl:block">{step.time}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        data-agent-chat-action="true"
        onClick={openAgentChat}
        onTouchEnd={openAgentChat}
        aria-label={`打开 ${displayName} 私聊输入框`}
        className="mt-2 flex h-8 w-full items-center gap-2 rounded-md border border-white/[0.065] bg-black/20 px-2.5 text-left transition-colors hover:border-cyan-300/20 hover:bg-cyan-300/[0.045]"
      >
        <MessageCircle size={12} className="shrink-0 text-white/25" />
        <span className="min-w-0 flex-1 truncate text-[10px] text-white/28">和 ${displayName} 私聊...</span>
        <Send size={12} className="shrink-0 text-white/18" />
      </button>

    </motion.article>
  );
}
