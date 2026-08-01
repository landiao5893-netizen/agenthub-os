// ============================================
// Agent Context Builder — 自动组装执行上下文
// 组合 Profile + Skills + Tools + Memory + Constitution + Task
// + 动态检索相关记忆（Memory Engine）
// ============================================

import { AgentContext, ExecutionTask } from "./types";
import { getAgentProfile } from "@/lib/agent-profiles";
import { getConstitution } from "@/constitution/data";
import { memoryRetrieval } from "@/memory/retrieval";
import { memoryStore } from "@/memory/store";
import { kbEngine } from "@/knowledge/engine";

export class AgentContextBuilder {
  /**
   * 为指定 Agent 构建完整执行上下文
   * 包含动态检索的相关记忆
   */
  build(agentId: string, task: ExecutionTask): AgentContext | null {
    const profile = getAgentProfile(agentId);
    if (!profile) return null;

    const constitution = getConstitution(agentId);
    if (!constitution) return null;

    // 🧠 动态检索相关记忆
    const retrievedContext = memoryRetrieval.getRetrievalContext(
      agentId, task.title, task.description
    );
    const knowledgeContext = kbEngine.getContextForTask(agentId, task.title, task.description);
    const availableContext = [retrievedContext, knowledgeContext].filter(Boolean).join("\n\n");

    return {
      profile,
      skills: profile.skills,
      tools: profile.tools,
      memory: profile.memory,
      performance: profile.performance,
      constitution,
      task,
      retrievedMemory: availableContext,
    };
  }

  /**
   * 生成上下文摘要（用于日志），包含检索记忆
   */
  summarize(context: AgentContext): string {
    const memStats = memoryStore.getStats(context.profile.id);
    const lines = [
      `Agent: ${context.profile.name} (${context.profile.title})`,
      `部门: ${context.profile.department}`,
      `模型: ${context.profile.model}`,
      `技能: ${context.skills.map(s => s.name).join("、")}`,
      `工具: ${context.tools.filter(t => t.granted).map(t => t.name).join("、")}`,
      `静态记忆: 长期${context.memory.longTerm.length}条 / 项目${context.memory.projectExperience.length}个`,
      `动态记忆: 已检索 ${memStats.total} 条（长期${memStats.longTerm}/项目${memStats.project}/知识${memStats.knowledge}/偏好${memStats.preference}）`,
      `宪法: ${context.constitution.workingPrinciples[0]}`,
      `禁止: ${context.constitution.prohibitions.length} 条红线`,
      `任务: ${context.task.title}`,
      `输入: ${context.task.input.slice(0, 80)}`,
    ];
    return lines.join("\n");
  }

  /**
   * 检查 Agent 是否有执行该任务的能力
   */
  checkCapability(context: AgentContext): { capable: boolean; missing: string[] } {
    const missing: string[] = [];
    const taskLower = context.task.title.toLowerCase() + context.task.description.toLowerCase();

    if (/搜索|调研|research|search|查找/.test(taskLower)) {
      const hasSearch = context.tools.some(t => t.granted && /搜索|search/.test(t.name.toLowerCase()));
      if (!hasSearch && !context.profile.title.includes("研究") && !context.profile.title.includes("搜索")) {
        missing.push("缺少搜索工具权限");
      }
    }

    if (/代码|code|开发|编程|实现|build/.test(taskLower)) {
      const hasTerminal = context.tools.some(t => t.granted && /terminal|终端|代码|执行/.test(t.name.toLowerCase()));
      if (!hasTerminal) missing.push("缺少代码执行工具");
    }

    if (/设计|design|视觉|配色|UI/.test(taskLower)) {
      const hasImageGen = context.tools.some(t => t.granted && /image|图像|设计/.test(t.name.toLowerCase()));
      if (!hasImageGen) missing.push("缺少图像生成工具");
    }

    return { capable: missing.length === 0, missing };
  }
}

export const contextBuilder = new AgentContextBuilder();
