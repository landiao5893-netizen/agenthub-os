"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
} from "lucide-react";
import { GlassCard, SectionHeader, Badge } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useRuntime } from "@/hooks/useRuntime";
import {
  RuntimeStatus, RUNTIME_STATUS_LABEL,
} from "@/types";
import { AGENT_PROFILES } from "@/lib/agent-profiles";

// ============================================
// 状态微缩样式
// ============================================
const MINI_STATUS: Record<RuntimeStatus, { color: string; bg: string; dot: string }> = {
  IDLE:      { color: "#71717a", bg: "bg-ah-surface", dot: "bg-zinc-500" },
  THINKING:  { color: "#a78bfa", bg: "bg-purple-500/5", dot: "bg-purple-400" },
  PLANNING:  { color: "#c084fc", bg: "bg-purple-500/5", dot: "bg-purple-400" },
  WORKING:   { color: "#60a5fa", bg: "bg-blue-500/5", dot: "bg-blue-400" },
  TOOL_CALL: { color: "#06b6d4", bg: "bg-cyan-500/5", dot: "bg-cyan-400" },
  WAITING:   { color: "#f59e0b", bg: "bg-amber-500/5", dot: "bg-amber-400" },
  COMPLETED: { color: "#10b981", bg: "bg-emerald-500/5", dot: "bg-emerald-400" },
  ERROR:     { color: "#f43f5e", bg: "bg-rose-500/5", dot: "bg-rose-400" },
};

// ============================================
// Agent 微缩运行时卡片
// ============================================
function AgentRuntimeMini({ agentId }: { agentId: string }) {
  const state = useRuntime(agentId);
  const profile = AGENT_PROFILES.find(p => p.id === agentId);
  if (!profile || !state) return null;

  const style = MINI_STATUS[state.status];
  const isActive = state.status !== "IDLE" && state.status !== "COMPLETED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "px-3 py-2.5 rounded-xl border transition-all duration-300",
        style.bg,
        `border-[${style.color}]/20`
      )}
      style={{ borderColor: `${style.color}22` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{profile.avatar}</span>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-ah-text-primary">{profile.name}</span>
          <span className="text-[10px] text-ah-text-muted ml-1.5">{profile.title}</span>
        </div>
        {isActive && (
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: style.color }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {state.status === "COMPLETED" && <CheckCircle2 size={14} className="text-emerald-400" />}
      </div>

      {/* 状态 + 进度 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px]" style={{ color: style.color }}>
          {RUNTIME_STATUS_LABEL[state.status]}
        </span>
        <span className="text-[10px] text-ah-text-disabled">·</span>
        <span className="text-[10px] text-ah-text-muted truncate">
          {state.thinkingAbout || "待命中"}
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-1 bg-ah-surface rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: style.color }}
          initial={{ width: "0%" }}
          animate={{ width: `${state.taskProgress}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>

      {/* 任务名 */}
      {state.currentTask && (
        <p className="text-[10px] text-ah-text-disabled mt-1.5 truncate">
          {state.currentTask.title}
        </p>
      )}
    </motion.div>
  );
}

// ============================================
// DAG 依赖图（简化版）
// ============================================
function DAGDiagram() {
  const nodes = [
    { id: "controller", label: "拆解任务", x: 50, y: 10, agentId: "controller" },
    { id: "research", label: "资料收集", x: 10, y: 55, agentId: "research-1" },
    { id: "content", label: "内容撰写", x: 50, y: 55, agentId: "content-1" },
    { id: "design", label: "视觉设计", x: 90, y: 55, agentId: "design-1" },
    { id: "reviewer", label: "质量审核", x: 50, y: 90, agentId: "reviewer-1" },
  ];

  const edges = [
    { from: "controller", to: "research" },
    { from: "controller", to: "design" },
    { from: "research", to: "content" },
    { from: "content", to: "reviewer" },
    { from: "design", to: "reviewer" },
  ];

  return (
    <div className="relative h-[180px]">
      {/* Edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((e, i) => {
          const from = nodes.find(n => n.id === e.from)!;
          const to = nodes.find(n => n.id === e.to)!;
          return (
            <line
              key={i}
              x1={`${from.x}%`} y1={`${from.y}%`}
              x2={`${to.x}%`} y2={`${to.y}%`}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <DAGNode key={node.id} node={node} />
      ))}
  </div>
  );
}

function DAGNode({ node }: { node: { label: string; x: number; y: number; agentId: string } }) {
  const state = useRuntime(node.agentId);
  const style = state ? MINI_STATUS[state.status] : MINI_STATUS.IDLE;
  const isActive = state && state.status !== "IDLE" && state.status !== "COMPLETED";

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: node.x + "%", top: node.y + "%" }}
      animate={isActive ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2"
        style={{ backgroundColor: style.color + "15", borderColor: style.color + "44", color: style.color }}
      >
        {state?.taskProgress ?? 0}%
      </div>
      <p className="text-[9px] text-ah-text-muted mt-0.5 text-center whitespace-nowrap">{node.label}</p>
    </motion.div>
  );
}

// ============================================
// 主面板
// ============================================
export function CollabDashboard() {
  const controllerState = useRuntime("controller");
  const researchState = useRuntime("research-1");
  const contentState = useRuntime("content-1");
  const designState = useRuntime("design-1");
  const reviewerState = useRuntime("reviewer-1");
  const allAgents = AGENT_PROFILES.filter(p => ["controller", "research-1", "content-1", "design-1", "reviewer-1"].includes(p.id));
  const states = [controllerState, researchState, contentState, designState, reviewerState];
  const completedCount = states.filter(s => s?.status === "COMPLETED").length;
  const totalProgress = Math.round(states.reduce((sum, s) => sum + (s?.taskProgress ?? 0), 0) / allAgents.length);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* ===== 项目总览 ===== */}
      <GlassCard padding="md" glow="purple">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-ah-text-primary">
              贵州城市产品手册
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={completedCount === allAgents.length ? "green" : "blue"}>
                {completedCount === allAgents.length ? "已完成" : "执行中"}
              </Badge>
              <span className="text-[10px] text-ah-text-muted">
                {completedCount}/{allAgents.length} Agent 完成
              </span>
            </div>
          </div>
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              <motion.circle cx="24" cy="24" r="20" fill="none" stroke="url(#collab-grad)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${totalProgress * 1.256} 125.6`}
                initial={{ strokeDasharray: "0 125.6" }}
                animate={{ strokeDasharray: `${totalProgress * 1.256} 125.6` }}
                transition={{ duration: 1 }}
              />
              <defs>
                <linearGradient id="collab-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ah-text-primary">
              {totalProgress}%
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-ah-surface rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-ah-accent-purple to-emerald-400"
            initial={{ width: "0%" }} animate={{ width: `${totalProgress}%` }} transition={{ duration: 1.2 }} />
        </div>
      </GlassCard>

      {/* ===== DAG 依赖图 ===== */}
      <GlassCard padding="md">
        <SectionHeader title="任务依赖 DAG" subtitle="数据流向" />
        <DAGDiagram />
      </GlassCard>

      {/* ===== 5 Agent 运行时卡片 ===== */}
      <SectionHeader title="AI 团队运行状态" subtitle="实时更新" />
      <div className="space-y-2">
        {allAgents.map(agent => (
          <AgentRuntimeMini key={agent.id} agentId={agent.id} />
        ))}
      </div>
    </div>
  );
}
