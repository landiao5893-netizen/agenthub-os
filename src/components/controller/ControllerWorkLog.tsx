"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  ListTree,
  Loader2,
  TerminalSquare,
} from "lucide-react";
import { GlassCard, Badge } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useProjectStore } from "@/stores/projectStore";
import type { EventLog } from "@/types";

const LEVEL_META: Record<EventLog["level"], { label: string; className: string; dot: string }> = {
  info: { label: "信息", className: "text-cyan-300", dot: "bg-cyan-300" },
  warn: { label: "警告", className: "text-amber-300", dot: "bg-amber-300" },
  error: { label: "错误", className: "text-rose-300", dot: "bg-rose-300" },
  success: { label: "成功", className: "text-emerald-300", dot: "bg-emerald-300" },
};

type LogFilter = "all" | EventLog["level"];

function RuntimeLogLine({ entry }: { entry: EventLog }) {
  const meta = LEVEL_META[entry.level];
  return (
    <div className="grid grid-cols-[70px_10px_minmax(0,1fr)] gap-2 border-b border-white/[0.035] py-2.5 last:border-0">
      <span className="pt-0.5 font-mono text-[9px] tabular-nums text-white/20">
        {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full", meta.dot)} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[10px] font-medium", meta.className)}>{entry.event}</span>
          <span className="rounded border border-white/[0.05] bg-white/[0.025] px-1.5 py-0.5 text-[8px] text-white/25">
            {entry.agentId}
          </span>
        </div>
        <p className="mt-1 break-words text-[10px] leading-relaxed text-white/48">{entry.detail}</p>
      </div>
    </div>
  );
}

export function ControllerWorkLog() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const eventLogs = useWorkflowStore((state) => state.eventLogs);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const projects = useProjectStore((state) => state.projects);
  const hydrateProjects = useProjectStore((state) => state.hydrate);
  const [filter, setFilter] = useState<LogFilter>("all");

  useEffect(() => { hydrateProjects(); }, [hydrateProjects]);

  const logs = useMemo(
    () => [...eventLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [eventLogs]
  );
  const filteredLogs = useMemo(
    () => filter === "all" ? logs : logs.filter((entry) => entry.level === filter),
    [filter, logs]
  );
  const completedNodes = workflow?.nodes.filter((node) => node.status === "completed").length ?? 0;
  const failedNodes = workflow?.nodes.filter((node) => node.status === "error").length ?? 0;
  const totalNodes = workflow?.nodes.length ?? 0;
  const errorCount = logs.filter((entry) => entry.level === "error").length;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-300">
              <TerminalSquare size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/82">运行日志中心</h2>
              <p className="text-[9px] text-white/25">Controller · Runtime · Workspace · Supervisor</p>
            </div>
          </div>
          <Badge variant={isRunning ? "blue" : "green"}>{isRunning ? "实时写入" : "已同步"}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="日志总数" value={logs.length} icon={<Activity size={12} />} />
          <Metric label="项目记录" value={projects.length} icon={<Clock3 size={12} />} />
          <Metric label="完成节点" value={completedNodes} icon={<CheckCircle2 size={12} />} />
          <Metric label="异常记录" value={errorCount + failedNodes} icon={<AlertCircle size={12} />} danger={errorCount + failedNodes > 0} />
        </div>

        {workflow && (
          <GlassCard padding="md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <ListTree size={13} className="shrink-0 text-violet-300" />
                <span className="truncate text-[11px] font-medium text-white/65">{workflow.name}</span>
              </div>
              <span className="text-[9px] text-white/25">{completedNodes}/{totalNodes} 完成</span>
            </div>
            <div className="grid gap-1.5 md:grid-cols-2">
              {workflow.nodes.map((node) => (
                <div key={node.id} className="flex items-center gap-2 rounded-lg border border-white/[0.045] bg-white/[0.018] px-2.5 py-2">
                  {node.status === "completed" ? <CheckCircle2 size={11} className="shrink-0 text-emerald-300" /> : node.status === "error" ? <AlertCircle size={11} className="shrink-0 text-rose-300" /> : node.status === "active" ? <Loader2 size={11} className="shrink-0 animate-spin text-cyan-300" /> : <Clock3 size={11} className="shrink-0 text-white/20" />}
                  <span className="min-w-0 flex-1 truncate text-[10px] text-white/48">{node.label}</span>
                  <span className="font-mono text-[8px] text-white/20">{node.progress}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard padding="md">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium text-white/65">执行事件</div>
              <div className="mt-0.5 text-[9px] text-white/22">显示真实执行链产生的持久化日志</div>
            </div>
            <div className="flex rounded-lg border border-white/[0.05] bg-black/15 p-0.5">
              {(["all", "info", "success", "warn", "error"] as LogFilter[]).map((value) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={cn("h-7 rounded-md px-2 text-[9px] transition-colors", filter === value ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/45")}>
                  {value === "all" ? "全部" : LEVEL_META[value].label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-1">
            {filteredLogs.length > 0 ? filteredLogs.map((entry) => <RuntimeLogLine key={entry.id} entry={entry} />) : (
              <div className="flex min-h-32 flex-col items-center justify-center text-center">
                <TerminalSquare size={20} className="mb-2 text-white/10" />
                <p className="text-[10px] text-white/25">{logs.length ? "该分类暂无日志" : "暂无执行日志"}</p>
                <p className="mt-1 text-[9px] text-white/15">讨论消息不会创建项目日志，明确执行任务后开始记录</p>
              </div>
            )}
          </div>
        </GlassCard>

        {projects.length > 0 && (
          <GlassCard padding="md">
            <div className="mb-2 text-[11px] font-medium text-white/65">最近项目</div>
            <div className="space-y-1.5">
              {projects.slice(0, 8).map((project) => (
                <div key={project.id} className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", project.status === "success" || project.status === "completed" ? "bg-emerald-300" : project.status === "failed" ? "bg-rose-300" : project.status === "waiting_recovery" ? "bg-amber-300" : "bg-cyan-300")} />
                  <span className="min-w-0 flex-1 truncate text-[10px] text-white/45">{project.name}</span>
                  <span className="text-[8px] text-white/20">{project.status}</span>
                  <span className="w-8 text-right font-mono text-[8px] text-white/20">{project.progress}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon, danger }: { label: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.018] px-3 py-2.5">
      <div className="flex items-center justify-between text-white/22">
        <span className="text-[9px]">{label}</span>
        <span className={danger ? "text-rose-300" : "text-white/20"}>{icon}</span>
      </div>
      <div className={cn("mt-1 text-base font-semibold tabular-nums", danger ? "text-rose-300" : "text-white/72")}>{value}</div>
    </div>
  );
}