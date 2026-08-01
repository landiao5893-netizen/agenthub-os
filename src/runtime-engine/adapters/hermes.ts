// ============================================
// HermesRuntime — 真实 智能中枢 适配器
// 通过 AgentHub 内部 Intelligence API 通信
// POST /api/chat-run/runs → 发送任务 + 等待结果
// ============================================

import {
  RuntimeAdapter, AgentContext, ExecutionResult,
  TimelineEntry, ExecutionPhase,
} from "../types";
import { promptEngine } from "../prompt-engine";
import { adapterRegistry } from "@/adapters/registry";
import { AGENTHUB_HERMES_SOURCE, getAgentHubHermesSessionSource } from "@/lib/hermes-session";

interface HermesRunResponse {
  session_id?: string;
  result?: { text?: string; content?: unknown };
  output?: string;
  [key: string]: unknown;
}

export class HermesRuntime implements RuntimeAdapter {
  readonly name = "AgentHubIntelligenceRuntime";
  readonly type = "hermes" as const;
  private aborted = false;
  private requestController: AbortController | null = null;
  private apiBase: string;
  private apiToken: string;
  private sessionId: string | null = null;

  constructor(config?: { apiUrl?: string; apiToken?: string }) {
    this.apiBase = config?.apiUrl ?? "/api/intelligence";
    this.apiToken = config?.apiToken ?? "";
  }

  abort(): void {
    this.aborted = true;
    this.requestController?.abort();
  }

  private formatDuration(ms: number): string {
    return (ms / 1000).toFixed(1) + 's';
  }

  private classifyError(message: string): 'timeout' | 'clarify' | 'network' | 'api' | 'unknown' {
    if (/504|timeout|超时|timed out/i.test(message)) return 'timeout';
    if (message.startsWith('CLARIFY_REQUESTED:')) return 'clarify';
    if (/network|fetch|ECONN|ENOTFOUND/i.test(message)) return 'network';
    if (/智能引擎 \\d+/i.test(message)) return 'api';
    return 'unknown';
  }

  private buildOutputContract(context: AgentContext): string {
    const title = context.profile.title + " " + context.task.title + " " + context.task.description;
    if (/设计|视觉|页面|UI|Design/i.test(title)) {
      return [
        "# 输出控制",
        "- 不要写入外部文件，不要生成超长设计稿。",
        "- 禁止调用图像生成、终端或其他外部工具；只输出文字视觉方案，系统会在下一步统一生成并保存图片。",
        "- 直接在回答中输出，控制在 900 字以内。",
        "- 必须包含：视觉方向、页面结构、色彩/字体/组件规范、交付注意事项。",
        "- 用分点结构，方便 Reviewer 读取。"
      ].join("\n");
    }
    if (/内容|文案|手册|品牌|Content/i.test(title)) {
      return [
        "# 输出控制",
        "- 不要写入外部文件，不要生成几万字全文。",
        "- 直接在回答中输出，控制在 1200 字以内。",
        "- 必须包含：产品定位、内容目录、核心页面文案示例、整合建议。",
        "- 事实性内容必须来自上游资料或明确假设。"
      ].join("\n");
    }
    if (/审核|质量|Reviewer|合规/i.test(title)) {
      return [
        "# 输出控制",
        "- 直接输出审核结论，控制在 700 字以内。",
        "- 必须包含：评分、通过状态、关键问题、修改建议、最终是否可交付。"
      ].join("\n");
    }
    return [
      "# 输出控制",
      "- 不要写入外部文件。",
      "- 直接输出当前任务结果，控制在 1000 字以内。",
      "- 输出必须结构化，方便下游 Agent 读取。"
    ].join("\n");
  }

  async *execute(context: AgentContext): AsyncGenerator<TimelineEntry, ExecutionResult, void> {
    this.aborted = false;
    const startedAt = Date.now();
    const timeline: TimelineEntry[] = [];

    const emit = (phase: ExecutionPhase, message: string, detail?: string, toolUsed?: string) => {
      const entry: TimelineEntry = {
        id: `hermes-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        timestamp: Date.now(), phase, message, detail, toolUsed,
      };
      timeline.push(entry);
      return entry;
    };

    try {
      // 1. 组装提示词
      const prompt = promptEngine.assemble(context);
      yield emit("context_load", `组装执行上下文（~${promptEngine.estimateTokens(prompt)} tokens）`);
      await this.delay(200);

      // 2. 发送到内部智能中枢
      yield emit("thinking", `发送任务到 智能中枢...`, `模型：${context.profile.model}`);

      const taskInput = `# 角色身份
你是 ${context.profile.name}，${context.profile.title}。

${prompt.systemPrompt}

# 当前任务
${prompt.taskPrompt}

如果信息不足，必须基于现有任务做合理假设继续执行，不要向用户反问。若城市未指定，按贵州城市产品手册处理，覆盖贵阳、遵义、黔东南等代表性城市与产品线。\n\n${this.buildOutputContract(context)}\n\n请完成以上任务。`;

      let runResult = "";
      for (let attempt = 1; attempt <= 3; attempt++) {
        const attemptStartedAt = Date.now();
        try {
          const inputForAttempt = attempt === 1 ? taskInput : ([String.fromCharCode(82,101,116,114,121,32,115,104,111,114,116,32,111,117,116,112,117,116), ...taskInput.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(attempt === 2 ? -30 : -18), String.fromCharCode(68,111,32,110,111,116,32,97,115,107,32,99,108,97,114,105,102,105,99,97,116,105,111,110,46)].join(String.fromCharCode(10)));
          if (attempt > 1) {
            yield emit("thinking", "智能中枢恢复重试 " + attempt + "/3", attempt === 2 ? "Context reduced with key facts kept" : "Context compressed further to avoid timeout");
          }
          yield emit("tool_call", "智能中枢调用 " + attempt + "/3", "Waiting for remote model; timeout will auto-recover", "agenthub.intelligence");
          runResult = await this.callHermesAPI(inputForAttempt, context.profile.id, context.profile.model);
          yield emit("executing", "智能中枢 returned", "Duration " + this.formatDuration(Date.now() - attemptStartedAt));
          break;
        } catch (retryErr: unknown) {
          const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
          const errorType = this.classifyError(retryMessage);
          const canRecover = errorType === "timeout";
          if (!canRecover || attempt === 3) {
            if (canRecover) {
              yield emit("error", "智能中枢连续三次超时", "Last error: " + retryMessage.slice(0, 180));
            }
            throw retryErr;
          }
          yield emit("error", "智能中枢超时，正在自动恢复", "Attempt " + attempt + "/3 failed; duration " + this.formatDuration(Date.now() - attemptStartedAt) + "; " + retryMessage.slice(0, 160));
        }
      }
      
      if (this.aborted) {
        return {
          taskId: context.task.id, agentId: context.profile.id,
          success: false, output: "任务被取消", timeline,
          toolCalls: 0, totalDurationMs: Date.now() - startedAt,
          startedAt, completedAt: Date.now(),
        };
      }

      // 3. 解析结果
      yield emit("executing", `智能中枢 已完成执行`);
      await this.delay(200);

      yield emit("output", runResult.slice(0, 100) + "...");
      await this.delay(100);

      yield emit("completed", "✅ 任务完成");
      const completedAt = Date.now();

      return {
        taskId: context.task.id,
        agentId: context.profile.id,
        success: true,
        output: runResult,
        timeline,
        toolCalls: 1,
        totalDurationMs: completedAt - startedAt,
        startedAt,
        completedAt,
      };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith("CLARIFY_REQUESTED:")) {
        const question = message.replace("CLARIFY_REQUESTED:", "").trim() || "AI 团队需要补充任务信息";
        yield emit("waiting_clarification", "AI 团队请求补充信息：" + question);
        return {
          taskId: context.task.id, agentId: context.profile.id,
          success: false, status: "waiting_clarification", output: question,
          clarification: { question }, timeline,
          toolCalls: 0, totalDurationMs: Date.now() - startedAt,
          startedAt, completedAt: Date.now(),
        };
      }
      const errorType = this.classifyError(message);
      const userMessage = errorType === "timeout"
        ? "智能中枢请求超时，已进入恢复或失败处理"
        : errorType === "network"
          ? "智能中枢网络请求失败"
          : "智能中枢执行失败：" + message;
      yield emit("error", userMessage, message.slice(0, 300));
      return {
        taskId: context.task.id, agentId: context.profile.id,
        success: false, status: "failed", output: "Error: " + userMessage + "; " + message, timeline,
        toolCalls: 0, totalDurationMs: Date.now() - startedAt,
        startedAt, completedAt: Date.now(),
      };
    }
  }

  // ===== 智能引擎 调用 =====
  private async callHermesAPI(input: string, agentId: string, fallbackModel: string): Promise<string> {
    // 使用 AgentHub 内部 Intelligence 端点
    // 实际请求由 AgentHub 服务端执行
    const binding = adapterRegistry.getBinding(agentId);
    const directProvider = binding && ["openai", "claude", "deepseek", "custom"].includes(binding.provider);
    const body = {
      input,
      provider: directProvider ? binding.provider : "opencode-go",
      providerConfigId: binding?.providerConfigId,
      model: binding?.model ?? fallbackModel,
      apiUrl: directProvider ? binding.apiUrl : undefined,
      apiToken: directProvider ? binding.apiToken : undefined,
      source: AGENTHUB_HERMES_SOURCE,
      session_source: getAgentHubHermesSessionSource("runtime", agentId),
      session_id: this.sessionId,
      run_mode: "runtime",
      timeout_ms: 90000,
    };

    const response = await this.mcpRequest("/api/intelligence/runs", "POST", body);

    // 保存 session_id 以便后续复用
    if (response.session_id) {
      this.sessionId = response.session_id;
    }

    // 提取文本响应
    if (response.result?.text) {
      return response.result.text;
    }
    if (response.result?.content) {
      return typeof response.result.content === "string"
        ? response.result.content
        : JSON.stringify(response.result.content);
    }
    if (response.output) {
      return response.output;
    }

    return JSON.stringify(response);
  }

  // ===== MCP 代理请求 =====
  private async mcpRequest(path: string, method: string, body: Record<string, unknown>): Promise<HermesRunResponse> {
    // 调用 AgentHub 内部 Intelligence API
    // AgentHub 前端通过 MCP 转发到此
    const url = path;
    
    const requestController = new AbortController();
    this.requestController = requestController;
    const timeoutId = setTimeout(() => requestController.abort(), 95000);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.apiToken) {
        headers["Authorization"] = `Bearer ${this.apiToken}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
        signal: requestController.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        if (res.status === 409) {
          let question = errText;
          try {
            const payload = JSON.parse(errText) as { error?: unknown; output?: unknown };
            const nested = typeof payload.error === "string" ? JSON.parse(payload.error) as { error?: unknown; output?: unknown } : payload;
            question = String(nested.output ?? nested.error ?? errText);
          } catch {}
          throw new Error("CLARIFY_REQUESTED:" + question.slice(0, 500));
        }
        throw new Error("智能引擎 " + res.status + ": " + errText.slice(0, 200));
      }

      return await res.json();
    } catch (err: unknown) {
      if (this.aborted) throw new Error("EXECUTION_ABORTED");
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error("智能引擎 请求超时");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (this.requestController === requestController) this.requestController = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
