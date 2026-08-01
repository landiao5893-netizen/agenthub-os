"use client";

import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import {
  GlassCard,
  SectionHeader,
  Badge,
} from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
  ChevronRight,
  Clock,
  Activity,
} from "lucide-react";

// 节点状态对应的图标
function NodeIcon({
  status,
}: {
  status: "pending" | "active" | "completed" | "error";
}) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    case "active":
      return (
        <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
      );
    case "error":
      return <AlertCircle size={14} className="text-rose-400 shrink-0" />;
    default:
      return <Circle size={14} className="text-ah-text-disabled shrink-0" />;
  }
}

function EventIcon({ level }: { level: "info" | "warn" | "error" | "success" }) {
  switch (level) {
    case "success":
      return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    case "error":
      return <AlertCircle size={14} className="text-rose-400 shrink-0" />;
    case "warn":
      return <Clock size={14} className="text-amber-400 shrink-0" />;
    default:
      return <Circle size={14} className="text-ah-text-disabled shrink-0" />;
  }
}

export function TaskMonitor() {
  const { workflow, eventLogs, isRunning } = useWorkflowStore();
  const { agents } = useAgentStore();

  if (!workflow) {
    return (
      <div className="p-4 text-center text-ah-text-disabled text-sm">
        暂无活跃工作流
      </div>
    );
  }

  const getAgentInfo = (id?: string) => agents.find((a) => a.id === id);
  const completedCount = workflow.nodes.filter(
    (n) => n.status === "completed"
  ).length;
  const totalCount = workflow.nodes.length;

  return (
    <div className="p-3 space-y-3">
      {/* ========== 项目概览 ========== */}
      <GlassCard padding="md" glow="purple">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-ah-text-primary">{workflow.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={isRunning ? "blue" : "green"}>{isRunning ? "运行中" : "已完成"}</Badge>
              <span className="text-[10px] text-ah-text-muted">{completedCount}/{totalCount} 节点</span>
            </div>
          </div>
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
              <motion.circle cx="20" cy="20" r="17" fill="none" stroke="url(#grad)" strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${(completedCount/totalCount)*106.8} 106.8`}
                initial={{ strokeDasharray: "0 106.8" }}
                animate={{ strokeDasharray: `${(completedCount/totalCount)*106.8} 106.8` }}
                transition={{ duration: 1, ease: "easeOut" }} />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ah-text-primary">
              {Math.round((completedCount/totalCount)*100)}%
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden mb-2.5">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-ah-accent-purple to-ah-accent-blue"
            initial={{ width: "0%" }} animate={{ width: `${(completedCount/totalCount)*100}%` }}
            transition={{ duration: 1, ease: "easeOut" }} />
        </div>

        {/* 参与 Agent + 预计时间 */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-ah-text-disabled">参与</span>
            <div className="flex -space-x-1">
              {["🧠","🔍","🎨","⚡","🛡️"].map((av,i) => (
                <span key={i} className="w-4 h-4 rounded-full bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-[7px]">{av}</span>
              ))}
            </div>
          </div>
          <span className="text-ah-text-disabled">
            {isRunning ? `预计 ${Math.ceil((totalCount-completedCount)*2)} 分钟` : "已完成"}
          </span>
        </div>
      </GlassCard>

      {/* ========== 任务流程 DAG ========== */}
      <GlassCard padding="md">
        <SectionHeader title="任务流程" subtitle="DAG 执行顺序" />
        <div className="space-y-1">
          {workflow.nodes.map((node, idx) => {
            const agent = getAgentInfo(node.assignedAgent);
            const isLast = idx === workflow.nodes.length - 1;

            return (
              <div key={node.id}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl transition-all duration-300",
                    node.status === "active" &&
                      "bg-blue-500/5 border border-blue-500/10",
                    node.status === "completed" &&
                      "bg-emerald-500/5 border border-emerald-500/10",
                    node.status === "error" &&
                      "bg-rose-500/5 border border-rose-500/10",
                    node.status === "pending" && "bg-transparent"
                  )}
                >
                  <NodeIcon status={node.status} />

                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-sm",
                        node.status === "completed" && "text-ah-text-secondary",
                        node.status === "active" && "text-ah-text-primary",
                        node.status === "pending" && "text-ah-text-disabled",
                        node.status === "error" && "text-rose-400"
                      )}
                    >
                      {node.label}
                    </span>
                    {agent && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px]">{agent.avatar}</span>
                        <span className="text-[10px] text-ah-text-muted truncate">
                          {agent.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {node.progress > 0 && node.status === "active" && (
                    <span className="text-xs text-blue-400 tabular-nums shrink-0">
                      {node.progress}%
                    </span>
                  )}
                  {node.status === "completed" && (
                    <span className="text-xs text-emerald-400 shrink-0">
                      100%
                    </span>
                  )}
                </motion.div>

                {!isLast && (
                  <div className="flex justify-center py-0.5">
                    <ChevronRight
                      size={16}
                      className="text-ah-text-disabled rotate-90"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ========== 事件日志 ========== */}
      <GlassCard padding="md" glow="cyan">
        <SectionHeader
          title="事件日志"
          subtitle={`最近 ${eventLogs.length} 条`}
          action={
            <div className="flex items-center gap-1">
              <Activity size={12} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400">实时</span>
            </div>
          }
        />
        <div className="space-y-1.5 max-h-[300px] md:max-h-[300px] overflow-y-auto">
          {eventLogs
            .slice()
            .reverse()
            .map((log, idx) => {
              const agent = getAgentInfo(log.agentId);
              const levelConfig = {
                info: "text-ah-text-muted",
                warn: "text-amber-400",
                error: "text-rose-400",
                success: "text-emerald-400",
              };

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-start gap-2 px-2 py-2 md:py-1.5 rounded-lg hover:bg-ah-surface/50 transition-colors"
                >
                  <div className="shrink-0 mt-0.5">
                    <EventIcon level={log.level} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-ah-text-primary truncate">
                        {log.event}
                      </span>
                      <span className="text-[10px] text-ah-text-disabled shrink-0">
                        {agent?.avatar}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5 truncate",
                        levelConfig[log.level]
                      )}
                    >
                      {log.detail}
                    </p>
                  </div>
                  <span className="text-[10px] text-ah-text-disabled shrink-0 mt-0.5">
                    {log.timestamp.toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </motion.div>
              );
            })}
        </div>
      </GlassCard>
    </div>
  );
}
