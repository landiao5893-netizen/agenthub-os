// ============================================
// Quality Gate — 任务质量检查评分引擎
// Agent 输出 → 5 维度评分 → PASS/FAIL
// ============================================

import { QualityScore, QualityDimension, QUALITY_DIMENSIONS, FailureType } from "./types";
import { AgentConstitution, getConstitution } from "@/constitution/data";

class QualityGate {
  /**
   * 对 Agent 输出进行质量评分
   */
  evaluate(
    agentId: string,
    agentName: string,
    taskTitle: string,
    taskDescription: string,
    output: string,
  ): QualityScore {
    const constitution = getConstitution(agentId);
    const dimensions: QualityDimension[] = QUALITY_DIMENSIONS.map(dim => {
      let score = 0;
      let comment = "";

      switch (dim.key) {
        case "completeness":
          [score, comment] = this.checkCompleteness(output);
          break;
        case "accuracy":
          [score, comment] = this.checkAccuracy(output);
          break;
        case "taskFit":
          [score, comment] = this.checkTaskFit(output, taskTitle, taskDescription);
          break;
        case "constitution":
          [score, comment] = this.checkConstitution(output, constitution);
          break;
        case "preference":
          [score, comment] = this.checkPreference(output);
          break;
      }

      return { name: dim.name, score, weight: dim.weight, comment };
    });

    const totalScore = Math.round(
      dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
    );

    let status: QualityScore["status"];
    if (totalScore >= 80) status = "PASS";
    else if (totalScore >= 60) status = "WARN";
    else status = "FAIL";

    return {
      agentId, agentName, taskTitle,
      dimensions, totalScore, 
      passed: totalScore >= 70,
      status,
      feedback: this.generateFeedback(dimensions, totalScore),
      checkedAt: Date.now(),
    };
  }

  /**
   * 快速检查（跳过详细评分，只看是否明显失败）
   */
  quickCheck(output: string): { passed: boolean; reason?: string; failureType?: FailureType } {
    if (!output || output.trim().length === 0) {
      return { passed: false, reason: "输出为空", failureType: "empty_output" };
    }
    if (output.length < 20) {
      return { passed: false, reason: "输出过短（<20字符）", failureType: "quality_low" };
    }
    if (output.includes("Error") || output.includes("error") || output.includes("失败")) {
      return { passed: false, reason: "输出包含错误信息", failureType: "api_error" };
    }
    return { passed: true };
  }

  // ===== 各维度检查 =====
  private checkCompleteness(output: string): [number, string] {
    let score = 75;
    
    // 检查输出长度（太短 = 不完整）
    if (output.length < 50) score = 30;
    else if (output.length < 150) score = 60;
    else if (output.length > 500) score = 90;

    // 检查是否分段/结构化
    if (output.includes("\n") || output.includes("##") || output.includes("- ")) score += 5;
    
    return [Math.min(100, score), `输出 ${output.length} 字符`];
  }

  private checkAccuracy(output: string): [number, string] {
    let score = 80;

    // 检查是否有明显的幻觉模式
    const hallmarks = [/As an AI/, /I don't know/, /无法确定/, /不确定/];
    for (const h of hallmarks) {
      if (h.test(output)) score -= 15;
    }

    // 检查是否有数字/数据支撑（表示有具体内容）
    if (/\d+/.test(output)) score += 5;

    return [Math.min(100, Math.max(0, score)), score >= 70 ? "无明显错误" : "可能包含不确定内容"];
  }

  private checkTaskFit(output: string, title: string, desc: string): [number, string] {
    let score = 75;
    const taskWords = (title + " " + desc).toLowerCase();

    // 检查输出是否与任务相关
    const keywords = taskWords.split(/\s+/).filter(w => w.length >= 2);
    let matches = 0;
    for (const kw of keywords) {
      if (output.toLowerCase().includes(kw)) matches++;
    }
    const matchRate = keywords.length > 0 ? matches / keywords.length : 0;
    score = Math.round(50 + matchRate * 50);

    return [Math.min(100, score), `关键词匹配率 ${Math.round(matchRate * 100)}%`];
  }

  private checkConstitution(output: string, constitution: AgentConstitution | undefined): [number, string] {
    if (!constitution) return [80, "无宪法定义"];

    let score = 85;
    const violations: string[] = [];

    // 检查禁止事项
    for (const p of (constitution.prohibitions ?? [])) {
      const pLower = p.toLowerCase();
      if (pLower.includes("AI 痕迹") || pLower.includes("套话")) {
        const aiPhrases = ["在当今时代", "综上所述", "总而言之", "由此可见"];
        for (const phrase of aiPhrases) {
          if (output.includes(phrase)) {
            violations.push(phrase);
            score -= 10;
          }
        }
      }
    }

    return [Math.max(0, score), violations.length > 0 ? `违反：${violations.join("、")}` : "符合宪法"];
  }

  private checkPreference(output: string): [number, string] {
    let score = 80;

    // 简洁性检查
    if (output.length > 2000) score -= 10;
    
    // 直接性检查
    const fluffWords = ["我想", "我认为", "在我看来", "my opinion"];
    for (const w of fluffWords) {
      if (output.includes(w)) score -= 5;
    }

    return [Math.max(0, score), score >= 80 ? "简洁直接" : "可更精简"];
  }

  private generateFeedback(dimensions: QualityDimension[], totalScore: number): string {
    if (totalScore >= 85) return "✅ 高质量输出，所有维度表现优秀";
    if (totalScore >= 70) return "⚠️ 基本达标，但仍有优化空间";
    
    const weak = dimensions.filter(d => d.score < 70);
    if (weak.length > 0) {
      return `❌ 需要改进：${weak.map(d => d.name).join("、")}`;
    }
    return "❌ 未达到质量标准";
  }
}

export const qualityGate = new QualityGate();
