// ============================================
// Prompt Assembly Engine — 根据 Agent 身份生成执行提示词
// 未来可替换为真实 LLM Prompt 模板
// ============================================

import { AgentContext, AssembledPrompt, ToolDefinition } from "./types";

export class PromptAssemblyEngine {
  /**
   * 组装完整提示词：System + Task + Tools + Rules
   */
  assemble(context: AgentContext): AssembledPrompt {
    const { profile, skills, tools, memory, constitution, task, retrievedMemory } = context;

    // 1. System Prompt
    const systemPrompt = this.buildSystemPrompt(profile, skills, memory, constitution);

    // 2. Task Prompt
    const taskPrompt = this.buildTaskPrompt(task);

    // 3. Tool Definitions
    const toolDefinitions = this.buildToolDefinitions(tools);

    // 4. Rules
    const rules = [
      ...constitution.workingPrinciples,
      ...constitution.prohibitions.map(p => `禁止：${p}`),
    ];

    // 5. Context summary
    const ctxSummary = [
      `你是一个 ${profile.title}，隶属于 ${profile.department}`,
      `当前任务：${task.title}`,
      `任务描述：${task.description}`,
      `输入数据：${task.input}`,
      retrievedMemory ? `可用记忆与知识：\n${retrievedMemory}` : "可用记忆与知识：无",
      `宪法要求：${constitution.workingPrinciples[0]}`,
    ].join("\n");

    return { systemPrompt, taskPrompt, toolDefinitions, rules, context: ctxSummary };
  }

  private buildSystemPrompt(
    profile: AgentContext["profile"],
    skills: AgentContext["skills"],
    memory: AgentContext["memory"],
    constitution: AgentContext["constitution"]
  ): string {
    const lines = [
      `# 角色定义`,
      `你是 ${profile.name}，职位 ${profile.title}，隶属于 ${profile.department}。`,
      `角色描述：${profile.roleDescription}`,
      ``,
      `# 核心技能`,
      ...skills.map(s => `- ${s.name} (Lv.${s.level}): ${s.description}`),
      ``,
      `# 工作经验`,
      ...memory.projectExperience.map(p => `- ${p.name}（${p.role}）：${p.outcome}`),
      ``,
      `# 工作原则`,
      ...constitution.workingPrinciples.map(p => `- ${p}`),
      ``,
      `# 输出标准`,
      ...constitution.outputStandards.map(s => `- ${s}`),
      ``,
      `# 禁止事项`,
      ...constitution.prohibitions.map(p => `- 🚫 ${p}`),
    ];
    return lines.join("\n");
  }

  private buildTaskPrompt(task: AgentContext["task"]): string {
    return [
      `# 当前任务`,
      `标题：${task.title}`,
      `描述：${task.description}`,
      `输入：${task.input}`,
      `优先级：${task.priority === "high" ? "🔴 高" : task.priority === "medium" ? "🟡 中" : "🟢 低"}`,
      `委派者：${task.assignedBy}`,
      ``,
      `请按照你的专业流程完成此任务，并遵守工作宪法。`,
    ].join("\n");
  }

  private buildToolDefinitions(tools: AgentContext["tools"]): ToolDefinition[] {
    return tools
      .filter(t => t.granted)
      .map(t => ({
        name: t.name,
        description: t.description,
        parameters: { input: "string" },
      }));
  }

  /**
   * 估算 Token 用量
   */
  estimateTokens(prompt: AssembledPrompt): number {
    const text = prompt.systemPrompt + prompt.taskPrompt + prompt.context;
    // 粗略估算：中文 ~1.5 字符/token，英文 ~4 字符/token
    return Math.ceil(text.length / 2);
  }
}

export const promptEngine = new PromptAssemblyEngine();
