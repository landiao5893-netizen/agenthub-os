"use client";

import { Activity, CheckCircle2, CircleAlert, Users } from "lucide-react";
import { useAgentStore } from "@/stores/agentStore";
import { useWorkflowStore } from "@/stores/workflowStore";

export function ProjectOverview() {
  const { workflow, isRunning } = useWorkflowStore();
  const agents = useAgentStore((state) => state.agents);
  const nodes = workflow?.nodes ?? [];
  const completed = nodes.filter((node) => node.status === "completed").length;
  const failed = nodes.some((node) => node.status === "error");
  const progress = nodes.length ? Math.round(nodes.reduce((sum, node) => sum + node.progress, 0) / nodes.length) : 0;
  const activeNode = nodes.find((node) => node.status === "active");

  const status = failed ? "需处理" : isRunning ? "执行中" : nodes.length > 0 && completed === nodes.length ? "已完成" : "待命";
  const StatusIcon = failed ? CircleAlert : isRunning ? Activity : CheckCircle2;
  const statusColor = failed ? "text-rose-300" : isRunning ? "text-cyan-300" : "text-emerald-300";

  return (
    <section className="shrink-0 border-b border-white/[0.05] bg-[#09090c] px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className={"mb-0.5 flex items-center gap-1 text-[9px] font-medium " + statusColor}>
            <StatusIcon size={11} />
            {status}
          </div>
          <h2 className="truncate text-[14px] font-semibold text-white/88">{workflow?.name ?? "团队已就绪"}</h2>
          <p className="truncate text-[9px] text-white/35">
            {activeNode?.label ?? (workflow ? <>{completed}/{nodes.length} 个阶段已完成</> : "输入想法进行讨论，确认后再执行")}
          </p>
        </div>
        <div className="flex items-center gap-1 pt-0.5 text-[9px] text-white/38">
          <Users size={12} />
          <span>{agents.length}</span>
        </div>
      </div>
      {workflow && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-500" style={{ width: progress + "%" }} />
          </div>
          <span className="w-8 text-right text-[9px] tabular-nums text-white/45">{progress}%</span>
        </div>
      )}
    </section>
  );
}