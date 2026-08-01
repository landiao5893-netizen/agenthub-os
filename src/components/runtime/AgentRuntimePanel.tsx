"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Zap,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Brain,
  ArrowRight,
} from "lucide-react";
import { GlassCard, SectionHeader, Badge } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useRuntime } from "@/hooks/useRuntime";
import {
  AgentRuntimeState,
  RuntimeStatus,
  RUNTIME_STATUS_LABEL,
  ToolCallRecord,
  WorkLogEntry,
} from "@/types";

// ============================================
// 状态 → 颜色 + 图标
// ============================================
const STATUS_STYLE: Record<RuntimeStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  IDLE:     { color: "#71717a", bg: "bg-ah-surface", icon: <Clock size={14} /> },
  THINKING: { color: "#a78bfa", bg: "bg-purple-500/10", icon: <Brain size={14} /> },
  PLANNING: { color: "#c084fc", bg: "bg-purple-500/10", icon: <Brain size={14} /> },
  WORKING:  { color: "#60a5fa", bg: "bg-blue-500/10", icon: <Zap size={14} /> },
  TOOL_CALL:{ color: "#06b6d4", bg: "bg-cyan-500/10", icon: <Wrench size={14} /> },
  WAITING:  { color: "#f59e0b", bg: "bg-amber-500/10", icon: <Clock size={14} /> },
  COMPLETED:{ color: "#10b981", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={14} /> },
  ERROR:    { color: "#f43f5e", bg: "bg-rose-500/10", icon: <AlertCircle size={14} /> },
};

// ============================================
// 工具调用记录卡片
// ============================================
function ToolCallCard({ record }: { record: ToolCallRecord }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-ah-surface border border-ah-border space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm">{record.icon}</span>
        <code className="text-[11px] font-mono text-blue-400">{record.toolName}</code>
        <span className="ml-auto text-[10px] text-ah-text-disabled">{record.durationMs}ms</span>
      </div>
      <div className="text-[10px] text-ah-text-muted pl-6">
        <span className="text-ah-text-disabled">输入：</span>{record.input}
      </div>
      <div className="text-[10px] text-emerald-400 pl-6">
        <span className="text-ah-text-disabled">输出：</span>{record.output}
      </div>
    </div>
  );
}

// ============================================
// 工作日志条目
// ============================================
function LogEntry({ entry }: { entry: WorkLogEntry }) {
  const colorMap = { info: "text-ah-text-muted", warn: "text-amber-400", error: "text-rose-400", debug: "text-ah-text-disabled" };
  return (
    <div className="flex items-start gap-2 py-0.5">
      <div className={cn("w-1 h-1 rounded-full mt-1.5 shrink-0", {
        "bg-ah-text-disabled": entry.level === "info" || entry.level === "debug",
        "bg-amber-400": entry.level === "warn",
        "bg-rose-400": entry.level === "error",
      })} />
      <span className="text-[10px] text-ah-text-disabled shrink-0 w-12 tabular-nums">
        {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span className={cn("text-[10px]", colorMap[entry.level])}>{entry.message}</span>
    </div>
  );
}

// ============================================
// 状态时间线节点
// ============================================
function StatusTimeline({ state }: { state: AgentRuntimeState }) {
  const statusOrder: RuntimeStatus[] = ["IDLE", "THINKING", "PLANNING", "WORKING", "TOOL_CALL", "WAITING", "COMPLETED"];
  const currentIdx = statusOrder.indexOf(state.status);

  return (
    <div className="flex items-center gap-1 px-2">
      {statusOrder.map((s, i) => {
        const style = STATUS_STYLE[s];
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={cn(
              "flex-1 flex flex-col items-center",
              isPast || isCurrent ? "opacity-100" : "opacity-30"
            )}>
              <motion.div
                className={cn(
                  "w-3 h-3 rounded-full flex items-center justify-center",
                  isCurrent && "animate-status-breathe"
                )}
                style={{
                  backgroundColor: isCurrent ? style.color : isPast ? style.color + "44" : "#27272a",
                  boxShadow: isCurrent ? `0 0 8px ${style.color}66` : "none",
                }}
                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[8px] mt-0.5 text-center leading-tight"
                style={{ color: isCurrent ? style.color : isPast ? style.color + "88" : "#52525b" }}>
                {RUNTIME_STATUS_LABEL[s]}
              </span>
            </div>
            {i < statusOrder.length - 1 && (
              <div className="h-px flex-1" style={{ backgroundColor: i < currentIdx ? style.color + "44" : "#27272a" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 主面板
// ============================================
interface AgentRuntimePanelProps {
  agentId: string;
}

export function AgentRuntimePanel({ agentId }: AgentRuntimePanelProps) {
  const state = useRuntime(agentId);

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center text-ah-text-disabled text-xs">
        等待 Runtime 启动...
      </div>
    );
  }

  const style = STATUS_STYLE[state.status];

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* ===== 当前任务卡片 ===== */}
      {state.currentTask && (
        <GlassCard padding="md" glow="purple">
          <div className="flex items-center justify-between mb-2">
            <Badge variant={state.currentTask.priority === "high" ? "red" : state.currentTask.priority === "medium" ? "amber" : "blue"}>
              {state.currentTask.priority === "high" ? "高优先" : state.currentTask.priority === "medium" ? "中优先" : "低优先"}
            </Badge>
            <span className="text-[10px] text-ah-text-disabled">
              来自 {state.currentTask.assignedBy}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-ah-text-primary mb-1">{state.currentTask.title}</h4>
          <p className="text-[11px] text-ah-text-muted mb-3">{state.currentTask.description}</p>

          {/* 进度条 */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-ah-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: style.color }}
                initial={{ width: "0%" }}
                animate={{ width: `${state.taskProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="text-[11px] font-mono text-ah-text-secondary tabular-nums">{state.taskProgress}%</span>
          </div>

          {/* 输入/输出 */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2 rounded-lg bg-ah-surface border border-ah-border">
              <div className="flex items-center gap-1 mb-1">
                <ArrowRight size={10} className="text-blue-400" />
                <span className="text-[10px] text-ah-text-muted">输入</span>
              </div>
              <p className="text-[10px] text-ah-text-secondary">{state.currentTask.input}</p>
            </div>
            <div className="p-2 rounded-lg bg-ah-surface border border-ah-border">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 size={10} className="text-emerald-400" />
                <span className="text-[10px] text-ah-text-muted">输出</span>
              </div>
              <p className="text-[10px] text-ah-text-secondary">
                {state.currentTask.output || (state.status === "COMPLETED" ? "任务完成" : "等待中...")}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ===== 状态时间线 ===== */}
      <GlassCard padding="md">
        <SectionHeader title="执行状态" />
        <div className="flex items-center gap-2 mb-3 px-2 py-2 rounded-xl"
          style={{ backgroundColor: style.bg, border: `1px solid ${style.color}22` }}>
          <motion.div
            animate={state.status !== "IDLE" && state.status !== "COMPLETED" ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {STATUS_STYLE[state.status].icon}
          </motion.div>
          <div>
            <span className="text-sm font-medium" style={{ color: style.color }}>
              {RUNTIME_STATUS_LABEL[state.status]}
            </span>
            {state.thinkingAbout && (
              <p className="text-[10px] text-ah-text-muted">{state.thinkingAbout}</p>
            )}
          </div>
          {state.estimatedRemaining > 0 && (
            <span className="ml-auto text-[10px] text-ah-text-disabled">
              预计剩余 {Math.ceil(state.estimatedRemaining)}s
            </span>
          )}
        </div>
        <StatusTimeline state={state} />
        {state.blockedBy && (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center gap-1.5">
            <Clock size={11} className="text-amber-400" />
            <span className="text-[10px] text-amber-400">等待 {state.blockedBy} 完成后继续</span>
          </div>
        )}
      </GlassCard>

      {/* ===== 近期操作 ===== */}
      {state.recentActions.length > 0 && (
        <GlassCard padding="md">
          <SectionHeader title="操作记录" />
          <div className="space-y-1">
            {state.recentActions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-ah-text-secondary">
                <span className="text-[10px] text-ah-text-disabled w-4 text-right">{i + 1}</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ===== 工具调用历史 ===== */}
      {state.toolHistory.length > 0 && (
        <GlassCard padding="md">
          <SectionHeader title="工具调用" subtitle={`${state.toolHistory.length} 次`} />
          <div className="space-y-2">
            {state.toolHistory.slice(0, 5).map((r) => (
              <ToolCallCard key={r.id} record={r} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* ===== 工作日志 ===== */}
      {state.workLog.length > 0 && (
        <GlassCard padding="md">
          <SectionHeader title="工作日志" subtitle={`${state.workLog.length} 条`} />
          <div className="max-h-[200px] overflow-y-auto space-y-0">
            {state.workLog.slice(0, 30).map((e) => (
              <LogEntry key={e.id} entry={e} />
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
