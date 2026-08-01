"use client";

import { AgentWorkCard } from "./AgentWorkCard";
import { useAgentStore } from "@/stores/agentStore";
import { useWorkflowStore } from "@/stores/workflowStore";

type CardStep = { label: string; time: string; status: "done" | "active" | "waiting" };

const BASE_STEPS: Record<string, CardStep[]> = {
  controller: [
    { label: "理解需求", time: "now", status: "done" },
    { label: "拆解任务", time: "now", status: "active" },
    { label: "调度团队", time: "--", status: "waiting" },
  ],
  "research-1": [
    { label: "智能分析", time: "tool", status: "active" },
    { label: "整理资料", time: "--", status: "waiting" },
    { label: "写入 Workspace", time: "--", status: "waiting" },
  ],
  "content-1": [
    { label: "读取 Research", time: "ctx", status: "active" },
    { label: "生成文案", time: "--", status: "waiting" },
    { label: "提交草稿", time: "--", status: "waiting" },
  ],
  "design-1": [
    { label: "读取共享上下文", time: "ctx", status: "active" },
    { label: "生成视觉方向", time: "--", status: "waiting" },
    { label: "输出规范", time: "--", status: "waiting" },
  ],
  "dev-1": [
    { label: "分析任务", time: "ctx", status: "active" },
    { label: "调用工具", time: "--", status: "waiting" },
    { label: "交付实现", time: "--", status: "waiting" },
  ],
  "reviewer-1": [
    { label: "接收交付物", time: "gate", status: "waiting" },
    { label: "Quality Gate", time: "--", status: "waiting" },
    { label: "输出评分", time: "--", status: "waiting" },
  ],
};

const STATUS_PROGRESS = {
  IDLE: 0,
  THINKING: 28,
  WORKING: 62,
  TOOL_CALL: 74,
  WAITING: 48,
  DONE: 100,
  ERROR: 92,
} as const;

export function AgentWorkGrid() {
  const { agents, runtimes } = useAgentStore();
  const { workflow, isRunning } = useWorkflowStore();
  const visibleAgents = agents;
  const runningCount = visibleAgents.filter((agent) => {
    const runtime = runtimes.get(agent.id);
    return runtime && ["THINKING", "WORKING", "TOOL_CALL", "WAITING"].includes(runtime.internalStatus);
  }).length;
  const completedNodes = workflow?.nodes.filter((node) => node.status === "completed").length ?? 0;
  const totalNodes = workflow?.nodes.length ?? 0;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/[0.04] bg-[#09090b]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/25">Agent Workspace</div>
            <h2 className="mt-1 text-xl font-semibold text-white/90">AI 员工工作台</h2>
            <p className="mt-1 text-[11px] text-white/35">
              {workflow?.name ?? "和主控 Agent 对话，合适时它会拆分任务并调度专家执行。"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right">
            <Metric label="当前员工" value={String(visibleAgents.length)} />
            <Metric label="运行中" value={String(runningCount)} active={isRunning} />
            <Metric label="阶段" value={totalNodes ? `${completedNodes}/${totalNodes}` : "0/0"} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
          {visibleAgents.map((agent) => {
            const runtime = runtimes.get(agent.id);
            const status = runtime?.internalStatus ?? "IDLE";
            const progress = STATUS_PROGRESS[status] ?? 0;
            const steps = BASE_STEPS[agent.id] ?? [
              { label: "读取上下文", time: "ctx", status: "waiting" as const },
              { label: "执行任务", time: "--", status: "waiting" as const },
              { label: "写入 Workspace", time: "--", status: "waiting" as const },
            ];

            return (
              <AgentWorkCard
                key={agent.id}
                card={{
                  agentId: agent.id,
                  percentage: progress,
                  eta: status === "DONE" ? "done" : "--",
                  steps,
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.025] px-3 py-2">
      <div className="text-[9px] text-white/25">{label}</div>
      <div className={active ? "text-[13px] font-semibold text-cyan-300" : "text-[13px] font-semibold text-white/75"}>
        {value}
      </div>
    </div>
  );
}
