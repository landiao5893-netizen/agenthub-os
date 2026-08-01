// ============================================
// Memory Retrieval — 根据任务检索相关记忆
// 关键词匹配 + 语义相似度模拟
// ============================================

import { memoryStore } from "./store";
import { MemoryEntry, MemoryRetrievalResult } from "./types";

class MemoryRetrieval {
  /**
   * 检索与任务相关的记忆
   * @param agentId Agent ID
   * @param taskTitle 任务标题
   * @param taskDescription 任务描述
   * @param maxResults 最多返回条数
   */
  retrieve(
    agentId: string,
    taskTitle: string,
    taskDescription: string,
    maxResults: number = 8
  ): MemoryRetrievalResult[] {
    const allMemories = memoryStore.getByAgent(agentId);
    if (allMemories.length === 0) return [];

    // 从任务中提取关键词
    const taskKeywords = this.extractTaskKeywords(taskTitle, taskDescription);

    // 计算每条记忆的相关度
    const scored: MemoryRetrievalResult[] = allMemories.map(entry => {
      const { score, reason } = this.calculateRelevance(entry, taskKeywords);
      return { entry, relevance: score, matchReason: reason };
    });

    // 按相关度排序，取 top N
    const sorted = scored
      .filter(s => s.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);

    // 标记已访问
    sorted.forEach(s => memoryStore.touch(s.entry.id));

    return sorted;
  }

  /**
   * 按类别分组检索结果
   */
  retrieveGrouped(
    agentId: string,
    taskTitle: string,
    taskDescription: string
  ): {
    longTerm: MemoryRetrievalResult[];
    project: MemoryRetrievalResult[];
    knowledge: MemoryRetrievalResult[];
    preference: MemoryRetrievalResult[];
  } {
    const results = this.retrieve(agentId, taskTitle, taskDescription, 20);
    
    return {
      longTerm: results.filter(r => r.entry.type === "long_term").slice(0, 3),
      project: results.filter(r => r.entry.type === "project").slice(0, 2),
      knowledge: results.filter(r => r.entry.type === "knowledge").slice(0, 3),
      preference: results.filter(r => r.entry.type === "preference").slice(0, 2),
    };
  }

  /**
   * 生成检索摘要（注入到 Context Builder）
   */
  getRetrievalContext(
    agentId: string,
    taskTitle: string,
    taskDescription: string
  ): string {
    const grouped = this.retrieveGrouped(agentId, taskTitle, taskDescription);
    const lines: string[] = [];

    if (grouped.longTerm.length > 0) {
      lines.push("## 长期记忆");
      grouped.longTerm.forEach(r => {
        lines.push(`- [重要度${r.entry.importance}] ${r.entry.content}`);
      });
    }

    if (grouped.preference.length > 0) {
      lines.push("\n## 用户偏好");
      grouped.preference.forEach(r => {
        lines.push(`- ${r.entry.content}`);
      });
    }

    if (grouped.project.length > 0) {
      lines.push("\n## 相关项目经验");
      grouped.project.forEach(r => {
        lines.push(`- ${r.entry.content}`);
      });
    }

    if (grouped.knowledge.length > 0) {
      lines.push("\n## 相关知识");
      grouped.knowledge.forEach(r => {
        lines.push(`- ${r.entry.content}`);
      });
    }

    return lines.length > 0 ? lines.join("\n") : "无相关记忆";
  }

  // ===== 私有 =====
  private extractTaskKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`;
    // 中英文混合提取
    const words = text
      .replace(/[，。！？、；：""（）【】\s]/g, " ")
      .split(" ")
      .filter(w => w.length >= 2)
      .slice(0, 15);
    // 去重
    return Array.from(new Set(words));
  }

  private calculateRelevance(
    entry: MemoryEntry,
    taskKeywords: string[]
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 1. 关键词匹配
    const contentLower = entry.content.toLowerCase();
    const keywordLower = entry.keywords.join(" ").toLowerCase();

    let keywordHits = 0;
    for (const kw of taskKeywords) {
      const kwl = kw.toLowerCase();
      if (contentLower.includes(kwl)) { keywordHits++; score += 0.3; }
      if (keywordLower.includes(kwl)) { score += 0.2; }
    }
    if (keywordHits > 0) reasons.push(`${keywordHits} 个关键词匹配`);

    // 2. 重要性加权
    score += entry.importance * 0.05;

    // 3. 记忆类型加权
    const typeWeights: Record<string, number> = {
      long_term: 0.15, preference: 0.15, project: 0.1, knowledge: 0.1, experience: 0.05,
    };
    score += typeWeights[entry.type] ?? 0;

    // 4. 访问频率加权（冷门记忆打折）
    if (entry.accessCount > 5) score += 0.05;

    // 5. 时效性（近期记忆加权）
    const hoursAgo = (Date.now() - entry.createdAt) / (1000 * 60 * 60);
    if (hoursAgo < 24) score += 0.1;

    // 规范化到 0-1
    score = Math.min(1, Math.max(0, score));

    return {
      score: Math.round(score * 100) / 100,
      reason: reasons.join("；") || "语义相关",
    };
  }
}

export const memoryRetrieval = new MemoryRetrieval();
