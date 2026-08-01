// ============================================
// OpenClawRuntime — OpenClaw Agent 真实执行适配器（预留）
// ============================================

import { RuntimeAdapter, AgentContext, ExecutionResult, TimelineEntry } from "../types";

export class OpenClawRuntime implements RuntimeAdapter {
  readonly name = "OpenClawRuntime";
  readonly type = "openclaw" as const;
  private aborted = false;

  abort(): void { this.aborted = true; }

  async *execute(context: AgentContext): AsyncGenerator<TimelineEntry, ExecutionResult, void> {
    // TODO: 连接真实 OpenClaw Agent
    // const client = new OpenClawClient({ endpoint: "...", auth: "..." });
    // const task = await client.submit({ agentId: context.profile.id, input: context.task.input });
    // for await (const update of task.stream()) {
    //   yield { ... };
    // }

    yield {
      id: `tl-${Date.now()}`, timestamp: Date.now(),
      phase: "received", message: `[OpenClaw] 预留接口：${context.task.title}`,
      detail: "真实 OpenClaw Agent 接入后启用",
    };

    return {
      taskId: context.task.id, agentId: context.profile.id,
      success: false, output: "[OpenClawRuntime] 尚未接入真实服务",
      timeline: [], toolCalls: 0, totalDurationMs: 0,
      startedAt: Date.now(), completedAt: Date.now(),
    };
  }
}
