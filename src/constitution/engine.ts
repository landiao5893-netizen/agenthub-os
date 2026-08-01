// ============================================
// Constitution Engine — 宪法合规检查
// Controller 调度时调用，确保任务分配符合 Agent 宪法
// ============================================

import { getConstitution, ConstitutionCheck } from "./data";

export class ConstitutionEngine {
  /**
   * 检查任务是否适合分配给指定 Agent
   */
  checkTask(agentId: string, taskTitle: string, taskDescription: string): ConstitutionCheck {
    const constitution = getConstitution(agentId);
    const result: ConstitutionCheck = {
      agentId,
      taskTitle,
      passed: true,
      warnings: [],
      violations: [],
      suggestions: [],
    };

    if (!constitution) {
      result.warnings.push(`${agentId} 没有定义宪法，跳过检查`);
      return result;
    }

    // 1. 禁止事项检查
    for (const prohibition of constitution.prohibitions) {
      const triggered = this.matchesProhibition(prohibition, taskTitle, taskDescription, agentId);
      if (triggered) {
        result.violations.push(`🚫 ${prohibition}`);
        result.passed = false;
      }
    }

    // 2. 输出标准建议
    for (const standard of constitution.outputStandards) {
      result.suggestions.push(`📋 ${standard}`);
    }

    // 3. 工作原则提示
    const relevantPrinciple = constitution.workingPrinciples[0];
    if (relevantPrinciple) {
      result.suggestions.push(`💡 原则：${relevantPrinciple}`);
    }

    return result;
  }

  /**
   * 获取 Agent 的前置条件
   * Controller 分发任务前检查
   */
  getPrerequisites(agentId: string): string[] {
    const constitution = getConstitution(agentId);
    if (!constitution) return [];
    return constitution.workingPrinciples.slice(0, 2);
  }

  /**
   * 获取推荐分配理由（Controller 选择 Agent 时用）
   */
  getRecommendation(agentId: string, taskType: string): string {
    const constitution = getConstitution(agentId);
    if (!constitution) return "";

    const principle = constitution.workingPrinciples.find(p =>
      p.toLowerCase().includes(taskType.toLowerCase())
    );
    if (principle) return `匹配宪法原则：${principle}`;

    return `遵循宪法：${constitution.workingPrinciples[0]}`;
  }

  // ===== 私有：规则匹配 =====
  private matchesProhibition(
    prohibition: string,
    title: string,
    description: string,
    agentId: string
  ): boolean {
    const combined = (title + " " + description).toLowerCase();
    const p = prohibition.toLowerCase();

    // 检查是否包含禁止的关键词
    const keywords: Record<string, string[]> = {
      "代码": ["code", "代码", "编程", "开发", "实现", "debug"],
      "搜索": ["search", "搜索", "调研", "research"],
      "设计": ["design", "设计", "视觉", "配色"],
    };

    // Agent 能力与禁止事项交叉检查
    const agentSkills: Record<string, string[]> = {
      "dev-1": ["代码"],
      "research-1": ["搜索", "调研"],
      "design-1": ["设计", "视觉"],
    };

    const agentKeywords = agentSkills[agentId] ?? [];
    for (const kw of agentKeywords) {
      const kwTerms = keywords[kw] ?? [];
      // 如果禁止事项涉及 Agent 的核心能力但任务描述也包含，检查更仔细
      if (p.includes(kw.toLowerCase())) {
        for (const term of kwTerms) {
          if (combined.includes(term)) {
            // 特殊豁免：Developer 可以做代码任务
            if (agentId === "dev-1" && kw === "代码") continue;
            // 特殊豁免：Research 可以做搜索
            if (agentId === "research-1" && kw === "搜索") continue;
            // 特殊豁免：Design 可以做设计
            if (agentId === "design-1" && kw === "设计") continue;
            return true;
          }
        }
      }
    }

    // 检查禁止分配给非 Developer 的代码任务
    if (p.includes("代码执行") && agentId !== "dev-1") {
      const codeTerms = ["terminal", "代码", "执行", "编程", "开发", "npm", "tsc", "build"];
      for (const term of codeTerms) {
        if (combined.includes(term.toLowerCase())) return true;
      }
    }

    // 检查编造数据
    if (p.includes("编造") || p.includes("猜测")) {
      // 这是预防性检查，不基于关键词
    }

    return false;
  }
}

export const constitutionEngine = new ConstitutionEngine();
