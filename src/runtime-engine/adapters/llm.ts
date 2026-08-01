// ============================================
// LLMRuntime — 直接调用 LLM API 执行（预留）
// DeepSeek / OpenAI / Claude 等
// ============================================

import { RuntimeAdapter, AgentContext, ExecutionResult, TimelineEntry } from "../types";
import { promptEngine } from "../prompt-engine";

export class LLMRuntime implements RuntimeAdapter {
  readonly name = "LLMRuntime";
  readonly type = "llm" as const;
  private aborted = false;

  abort(): void { this.aborted = true; }

  async *execute(context: AgentContext): AsyncGenerator<TimelineEntry, ExecutionResult, void> {
    // 1. 组装提示词
    const prompt = promptEngine.assemble(context);
    yield {
      id: `tl-${Date.now()}`, timestamp: Date.now(),
      phase: "context_load",
      message: `组装提示词完成（~${promptEngine.estimateTokens(prompt)} tokens）`,
      detail: `System: ${prompt.systemPrompt.length}字 / Task: ${prompt.taskPrompt.length}字`,
    };

    // TODO: 调用真实 LLM API
    // const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${apiKey}` },
    //   body: JSON.stringify({
    //     model: context.profile.model,
    //     messages: [
    //       { role: "system", content: prompt.systemPrompt },
    //       { role: "user", content: prompt.taskPrompt },
    //     ],
    //   }),
    // });
    // const data = await response.json();
    // const output = data.choices[0].message.content;

    yield {
      id: `tl-${Date.now()}`, timestamp: Date.now(),
      phase: "received", message: `[LLM] 预留接口：${context.task.title}`,
      detail: `模型：${context.profile.model} | 真实 LLM API 接入后启用`,
    };

    return {
      taskId: context.task.id, agentId: context.profile.id,
      success: false, output: "[LLMRuntime] 尚未接入真实 LLM API",
      timeline: [], toolCalls: 0, totalDurationMs: 0,
      startedAt: Date.now(), completedAt: Date.now(),
    };
  }
}
