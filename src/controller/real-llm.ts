// ============================================
// Controller planning client — routed through AgentHub Intelligence
// 替换 MockLLM，支持任意需求理解
// ============================================

import { TaskAnalysis } from "./types";
import { mockLLM } from "./mock-llm";
import { useAgentStore } from "@/stores/agentStore";
import { adapterRegistry } from "@/adapters/registry";
import { AGENTHUB_HERMES_SOURCE, getAgentHubHermesSessionSource } from "@/lib/hermes-session";

interface ParsedLLMSubtask {
  id?: string;
  title?: string;
  description?: string;
  assignedAgent?: string;
  priority?: "low" | "medium" | "high";
  input?: string;
  dependsOn?: string[];
  expectedOutput?: string;
}

interface ParsedLLMResponse {
  intent?: string;
  domain?: string;
  complexity?: "simple" | "medium" | "complex";
  subtasks?: ParsedLLMSubtask[];
  dag?: { from: string; to: string }[];
  estimatedMinutes?: number;
}

class RealLLM {

  private compactPlanningInput(userInput: string): string {
    const attachmentStart = userInput.indexOf("<agenthub_attachment");
    if (attachmentStart < 0) return userInput.slice(0, 6000);

    const contentStart = userInput.indexOf("\ncontent:\n", attachmentStart);
    if (contentStart < 0) return userInput.slice(0, 6000);

    const metadata = userInput.slice(attachmentStart, contentStart);
    const content = userInput.slice(contentStart + "\ncontent:\n".length);
    const contentEnd = content.lastIndexOf("</agenthub_attachment>");
    const attachmentText = (contentEnd >= 0 ? content.slice(0, contentEnd) : content).trim();
    const preview = attachmentText.slice(0, 1800);
    return [
      userInput.slice(0, attachmentStart).trim(),
      metadata,
      "content_preview:",
      preview,
      `[Attachment content omitted during planning: ${Math.max(0, attachmentText.length - preview.length)} characters. Assign detailed analysis to an execution Agent.]`,
      "</agenthub_attachment>",
    ].filter(Boolean).join("\n");
  }

  /**
   * 用真实 DeepSeek API 分析用户需求 → 结构化任务拆解
   * 失败时自动降级到 MockLLM
   */
  async analyze(userInput: string, signal?: AbortSignal): Promise<TaskAnalysis> {
    try {
      return await this.callDeepSeek(userInput, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn("RealLLM failed, falling back to MockLLM:", err);
      return mockLLM.analyze(userInput);
    }
  }

  private buildAgentCatalog(): string {
    const agents = useAgentStore.getState().agents;
    return agents.map((agent) => {
      const skills = agent.skills?.length ? agent.skills.join("、") : agent.roleLabel;
      return "- " + agent.id + " (" + agent.name + " / " + agent.roleLabel + ")：" + skills;
    }).join("\n");
  }

  private async callDeepSeek(rawUserInput: string, signal?: AbortSignal): Promise<TaskAnalysis> {
    const userInput = this.compactPlanningInput(rawUserInput);
    const agentCatalog = this.buildAgentCatalog();
    const prompt = `你是一个 AI 项目总监。请分析以下用户需求，拆解为可执行的子任务，并指定每个子任务由哪个 Agent 执行。

可用的 Agent 及其职责：
${agentCatalog}

Agent 选择规则：
- 必须只从上面的 Agent ID 中选择 assignedAgent。
- 如果用户需求明确要求某个自定义员工、某个职位、某个名称，优先分配给匹配的自定义 Agent。
- 如果没有明确指定，使用最匹配职责的 Agent。

复杂创作任务拆解规则：如果用户需求包含手册、画册、品牌方案、城市产品、产品手册、宣传册，必须压缩为 4-5 个阶段任务，禁止拆成 8 个以上小任务，禁止拆出 Developer。推荐结构：Research=资料收集+竞品分析+城市定位；Content=产品定位+内容结构+页面文案+文案整合；Design=视觉方向+页面结构+设计规范；Reviewer=最终审核。每个 Content 输出控制在 800 字以内，所有子任务总数不超过 5 个。

请返回纯 JSON（不要 markdown 代码块），格式如下：
{
  "intent": "一句话总结用户意图",
  "domain": "领域分类（内容创作/软件开发/视觉设计/数据分析/信息调研/质量审核）",
  "complexity": "simple|medium|complex",
  "subtasks": [
    {
      "id": "t1",
      "title": "子任务标题",
      "description": "详细描述",
      "assignedAgent": "research-1",
      "priority": "high|medium|low",
      "input": "给 Agent 的输入",
      "dependsOn": [],
      "expectedOutput": "预期产出"
    }
  ],
  "dag": [
    {"from": "t1", "to": "t2"}
  ],
  "estimatedMinutes": 10
}

用户需求：${userInput}

请只返回 JSON，不要加任何解释。`;

    const binding = adapterRegistry.getBinding("controller");
    const directProvider = binding && ["openai", "claude", "deepseek", "custom"].includes(binding.provider);
    const body = {
      input: prompt,
      provider: directProvider ? binding.provider : "opencode-go",
      providerConfigId: binding?.providerConfigId,
      model: binding?.model ?? "deepseek-v4-flash",
      apiUrl: directProvider ? binding.apiUrl : undefined,
      apiToken: directProvider ? binding.apiToken : undefined,
      source: AGENTHUB_HERMES_SOURCE,
      session_source: getAgentHubHermesSessionSource("controller_analysis"),
      run_mode: "planning",
      instructions: "Planning only. Do not call any tool, execute code, browse, read files, or delegate. Return exactly one JSON object and stop.",
      timeout_ms: 45000,
    };

    const res = await fetch("/api/intelligence/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(55000)]) : AbortSignal.timeout(55000),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    if (!data.ok || !data.output) throw new Error("API 返回异常");

    // 解析 JSON（DeepSeek 可能返回 markdown 包裹的 JSON）
    const json = this.extractJSON(data.output);
    const parsed = JSON.parse(json) as ParsedLLMResponse;

    // 补充默认值
    return {
      intent: parsed.intent ?? userInput.slice(0, 20),
      domain: parsed.domain ?? "综合任务",
      complexity: parsed.complexity ?? "medium",
      suggestedAgents: Array.from(new Set((parsed.subtasks ?? []).map((s) => this.normalizeAssignedAgent(s.assignedAgent)))),
      subtasks: (parsed.subtasks ?? []).map((s, i: number) => ({
        id: s.id ?? `t${i+1}`,
        title: s.title ?? `子任务 ${i+1}`,
        description: s.description ?? s.title ?? "",
        assignedAgent: this.normalizeAssignedAgent(s.assignedAgent),
        priority: s.priority ?? "medium",
        input: s.input ?? userInput,
        dependsOn: s.dependsOn ?? [],
        expectedOutput: s.expectedOutput ?? "完成",
      })),
      dag: (parsed.dag ?? []).map((e) => ({
        from: e.from, to: e.to,
      })),
      estimatedMinutes: parsed.estimatedMinutes ?? 10,
    };
  }

  private normalizeAssignedAgent(agentId?: string): string {
    const agents = useAgentStore.getState().agents;
    if (agentId && agents.some((agent) => agent.id === agentId)) return agentId;
    return "controller";
  }

  private extractJSON(text: string): string {
    // 去除 markdown 代码块包裹
    let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    // 找第一个 { 到最后一个 }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
    return cleaned;
  }
}

export const realLLM = new RealLLM();
