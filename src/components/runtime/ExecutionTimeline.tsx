"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Wrench, Zap, CheckCircle2, AlertCircle,
  FileText, Play, Square, Gavel,
} from "lucide-react";
import { GlassCard, SectionHeader, Badge } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { runtimeEngine } from "@/runtime-engine/engine";
import {
  TimelineEntry, ExecutionPhase, EXECUTION_PHASE_LABEL,
  ExecutionResult, ExecutionTask,
} from "@/runtime-engine/types";
import { getAgentProfile } from "@/lib/agent-profiles";

// ============================================
// 阶段图标
// ============================================
const PHASE_ICON: Record<ExecutionPhase, React.ReactNode> = {
  received: <FileText size={12} />,
  context_load: <Brain size={12} />,
  rule_check: <Gavel size={12} />,
  thinking: <Brain size={12} />,
  tool_call: <Wrench size={12} />,
  executing: <Zap size={12} />,
  output: <FileText size={12} />,
  completed: <CheckCircle2 size={12} />,
  waiting_clarification: <AlertCircle size={12} />,
  error: <AlertCircle size={12} />,
};

const PHASE_COLOR: Record<ExecutionPhase, string> = {
  received: "#71717a", context_load: "#a78bfa", rule_check: "#f59e0b",
  thinking: "#a78bfa", tool_call: "#06b6d4", executing: "#60a5fa",
  output: "#10b981", waiting_clarification: "#f59e0b", completed: "#10b981", error: "#f43f5e",
};

// ============================================
// 单条时间线
// ============================================
function TimelineRow({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-6 pb-2"
    >
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
        <div className="w-3 h-3 rounded-full mt-1 flex items-center justify-center"
          style={{ backgroundColor: PHASE_COLOR[entry.phase], boxShadow: `0 0 6px ${PHASE_COLOR[entry.phase]}66` }}>
        </div>
        {!isLast && <div className="w-px flex-1 bg-ah-border mt-0.5" />}
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{ color: PHASE_COLOR[entry.phase] }}>{PHASE_ICON[entry.phase]}</span>
        <span className="text-[10px] font-medium" style={{ color: PHASE_COLOR[entry.phase] }}>
          {EXECUTION_PHASE_LABEL[entry.phase]}
        </span>
        <span className="text-[9px] text-ah-text-disabled ml-auto">
          {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
      <p className="text-[10px] text-ah-text-secondary mt-0.5 ml-4">{entry.message}</p>
      {entry.detail && (
        <p className="text-[9px] text-ah-text-muted mt-0.5 ml-4 truncate">{entry.detail}</p>
      )}
    </motion.div>
  );
}

// ============================================
// 主面板
// ============================================
interface ExecutionTimelineProps {
  agentId: string;
}

export function ExecutionTimeline({ agentId }: ExecutionTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const profile = getAgentProfile(agentId);

  const handleExecute = async () => {
    if (running) return;
    setRunning(true);
    setTimeline([]);
    setResult(null);

    const task: ExecutionTask = {
      id: `exec-${Date.now()}`,
      title: "执行演示任务",
      description: `演示 ${profile?.name ?? agentId} 的完整执行流程`,
      input: "演示输入数据：验证 Runtime Engine 完整链路",
      priority: "medium",
      assignedBy: "Controller Agent",
    };

    const res = await runtimeEngine.executeWithCallback(agentId, task, (entry) => {
      setTimeline(prev => [...prev, entry]);
    });
    setResult(res);
    setRunning(false);
  };

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ah-text-primary">执行时间线</h3>
          <p className="text-[10px] text-ah-text-muted">MockRuntime · {profile?.model}</p>
        </div>
        <button onClick={handleExecute} disabled={running}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
            running
              ? "bg-ah-surface text-ah-text-muted"
              : "bg-ah-accent-purple/15 text-ah-accent-purple border border-ah-accent-purple/30 hover:bg-ah-accent-purple/25"
          )}>
          {running ? <Square size={12} className="animate-pulse" /> : <Play size={12} />}
          {running ? "执行中..." : "执行任务"}
        </button>
      </div>

      {/* 上下文摘要 */}
      {timeline.length > 0 && (
        <GlassCard padding="md">
          <SectionHeader title="执行上下文" />
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {[
              ["Agent", profile?.name],
              ["模型", profile?.model],
              ["技能", `${profile?.skills.length} 项`],
              ["工具", `${profile?.tools.filter(t => t.granted).length} 个`],
              ["宪法", `${profile?.id ? "已加载" : "-"}`],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-1">
                <span className="text-ah-text-disabled">{k}:</span>
                <span className="text-ah-text-secondary">{v}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 时间线 */}
      {timeline.length > 0 && (
        <GlassCard padding="md">
          <SectionHeader title="执行记录" subtitle={`${timeline.length} 步`} />
          <div className="space-y-0">
            {timeline.map((entry, i) => (
              <TimelineRow key={entry.id} entry={entry} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* 结果 */}
      {result && (
        <GlassCard padding="md" glow={result.success ? "blue" : "none"}>
          <SectionHeader title="执行结果" />
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={result.success ? "green" : "red"}>
              {result.success ? "成功" : "失败"}
            </Badge>
            <span className="text-[10px] text-ah-text-muted">
              {result.toolCalls} 次工具调用 · {(result.totalDurationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <p className="text-[10px] text-ah-text-secondary bg-ah-surface p-2 rounded-lg whitespace-pre-wrap">
            {result.output}
          </p>
        </GlassCard>
      )}

      {/* 空状态 */}
      {timeline.length === 0 && !running && (
        <div className="text-center py-8 text-ah-text-disabled text-xs">
          点击「执行任务」查看 Agent 完整执行流程
        </div>
      )}
    </div>
  );
}
