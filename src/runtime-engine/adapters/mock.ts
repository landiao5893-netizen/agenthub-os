// ============================================
// MockRuntime — 模拟执行引擎
// 按专业流程逐步模拟执行，产出时间线记录
// ============================================

import {
  RuntimeAdapter, AgentContext, ExecutionResult,
  TimelineEntry, ExecutionPhase,
} from "../types";
import { contextBuilder } from "../context-builder";
import { promptEngine } from "../prompt-engine";

export class MockRuntime implements RuntimeAdapter {
  readonly name = "MockRuntime";
  readonly type = "mock" as const;
  private aborted = false;

  abort(): void {
    this.aborted = true;
  }

  async *execute(context: AgentContext): AsyncGenerator<TimelineEntry, ExecutionResult, void> {
    this.aborted = false;
    const startedAt = Date.now();
    const timeline: TimelineEntry[] = [];
    let toolCalls = 0;

    const emit = (phase: ExecutionPhase, message: string, detail?: string, toolUsed?: string) => {
      const entry: TimelineEntry = {
        id: `tl-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        timestamp: Date.now(),
        phase, message, detail, toolUsed,
      };
      timeline.push(entry);
      return entry;
    };

    // 1. 收到任务
    yield emit("received", `收到任务：${context.task.title}`, `委派者：${context.task.assignedBy}`);
    await this.delay(300);

    // 2. 加载上下文
    const summary = contextBuilder.summarize(context);
    yield emit("context_load", "加载 Agent 上下文", summary);
    await this.delay(400);

    // 3. 读取宪法
    const rules = context.constitution.workingPrinciples;
    yield emit("rule_check", `读取工作宪法（${rules.length} 条原则）`, rules[0]);
    await this.delay(300);

    // 4. 检查能力
    const capCheck = contextBuilder.checkCapability(context);
    if (!capCheck.capable) {
      yield emit("error", `能力不足：${capCheck.missing.join("、")}`);
      return { taskId: context.task.id, agentId: context.profile.id, success: false, output: `能力不足：${capCheck.missing.join("、")}`, timeline, toolCalls: 0, totalDurationMs: Date.now() - startedAt, startedAt, completedAt: Date.now() };
    }

    // 5. 按专业流程逐步执行
    const workflow = context.constitution.professionalWorkflow;
    for (let i = 0; i < workflow.length; i++) {
      if (this.aborted) break;
      const step = workflow[i];

      yield emit("thinking", `Step ${step.order}: ${step.phase} — ${step.action}`, step.check);
      await this.delay(600 + Math.random() * 400);

      // 如果阶段涉及工具调用
      if (step.phase.includes("工具") || step.phase.includes("调用") || step.phase.includes("采集") || step.phase.includes("搜索")) {
        const tool = context.tools.find(t => t.granted);
        if (tool) {
          toolCalls++;
          yield emit("tool_call", `调用工具：${tool.name}`, tool.description, tool.name);
          await this.delay(400 + Math.random() * 300);
        }
      }

      // 检查阶段完成标准
      yield emit("executing", `检查：${step.check}`, `进度 ${Math.round(((i+1)/workflow.length)*100)}%`);
      await this.delay(200);
    }

    // 6. 组装提示词（演示用）
    const prompt = promptEngine.assemble(context);
    yield emit("thinking", `生成执行上下文（~${promptEngine.estimateTokens(prompt)} tokens）`);
    await this.delay(300);

    // 7. 输出结果
    const output = this.generateOutput(context);
    yield emit("output", output.slice(0, 80) + "...", output);
    await this.delay(200);

    // 8. 完成
    yield emit("completed", `✅ 任务完成：${context.task.title}`);
    const completedAt = Date.now();

    return {
      taskId: context.task.id,
      agentId: context.profile.id,
      success: true,
      output,
      timeline,
      toolCalls,
      totalDurationMs: completedAt - startedAt,
      startedAt,
      completedAt,
    };
  }

  private generateOutput(context: AgentContext): string {
    const profile = context.profile;
    const task = context.task;
    return [
      `[${profile.name}] 任务执行完成`,
      `任务：${task.title}`,
      `产出：基于${profile.skills.length}项技能和${profile.tools.filter(t=>t.granted).length}个工具，`,
      `遵循「${context.constitution.workingPrinciples[0]}」原则，`,
      `按${context.constitution.professionalWorkflow.length}步专业流程完成。`,
    ].join("\n");
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
