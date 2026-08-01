// ============================================
// Memory Summarizer — 任务完成后自动总结新经验
// ============================================

import { memoryStore } from "./store";
import { MemoryEntry, MemoryUpdateInput } from "./types";

type NewMemoryEntry = Omit<MemoryEntry, "id" | "createdAt" | "lastAccessed" | "accessCount">;

class MemorySummarizer {
  /**
   * 从任务执行结果中提取新记忆
   */
  summarize(
    agentId: string,
    taskTitle: string,
    taskDescription: string,
    taskOutput: string,
    success: boolean,
  ): MemoryUpdateInput {
    const input: MemoryUpdateInput = {
      agentId, taskTitle, taskDescription, taskOutput, success,
      newFacts: [],
      newPreferences: [],
      newKnowledge: [],
    };

    // 1. 从输出中提取新知识
    input.newKnowledge = this.extractKnowledge(taskOutput);

    // 2. 从描述中提取新偏好
    input.newPreferences = this.extractPreferences(taskDescription);

    // 3. 生成经验教训
    if (success) {
      input.newFacts.push(`${taskTitle} — 执行成功，产出：${taskOutput.slice(0, 60)}`);
    } else {
      input.newFacts.push(`${taskTitle} — 执行失败，需复盘`);
    }

    return input;
  }

  /**
   * 自动更新记忆（在任务完成后调用）
   */
  async updateAfterTask(
    agentId: string,
    taskTitle: string,
    taskDescription: string,
    taskOutput: string,
    success: boolean,
  ): Promise<number> {
    const before = memoryStore.getStats(agentId).total;
    const input = this.summarize(agentId, taskTitle, taskDescription, taskOutput, success);
    memoryStore.fromTaskUpdate(input);
    return memoryStore.getStats(agentId).total - before;
  }

  /** 用户一表达偏好就本地记录，不等待模型返回 */
  learnFromUserMessage(agentId: string, userMessage: string): number {
    const before = memoryStore.getStats(agentId).total;
    const preferences = this.extractExplicitPreferences(userMessage);
    memoryStore.addMany(preferences.map((content): NewMemoryEntry => ({
      agentId,
      type: "preference",
      content,
      keywords: this.extractKeywords(content),
      importance: 5,
      source: "conversation:user",
    })));
    return memoryStore.getStats(agentId).total - before;
  }

  /** 私聊完成后沉淀主题、回答经验和可复用知识 */
  async updateAfterConversation(agentId: string, userMessage: string, agentResponse: string): Promise<number> {
    const before = memoryStore.getStats(agentId).total;
    const entries: NewMemoryEntry[] = [];
    const response = agentResponse.trim();

    this.extractExplicitPreferences(userMessage).forEach((content) => entries.push({
      agentId, type: "preference", content,
      keywords: this.extractKeywords(content), importance: 5, source: "conversation:user",
    }));

    if (response) {
      entries.push({
        agentId,
        type: "experience",
        content: `私聊经验：${userMessage.slice(0, 80)} -> ${response.slice(0, 120)}`,
        keywords: this.extractKeywords(userMessage),
        context: userMessage.slice(0, 160),
        importance: 3,
        source: "conversation:response",
      });
      this.extractKnowledge(response).forEach((content) => entries.push({
        agentId, type: "knowledge", content,
        keywords: this.extractKeywords(content), importance: 3, source: "conversation:response",
      }));
    }

    memoryStore.addMany(entries);
    return memoryStore.getStats(agentId).total - before;
  }

  /** 将 Supervisor 评分转为下一次执行可检索的复盘经验 */
  async updateFromQualityFeedback(
    agentId: string, taskTitle: string, score: number, feedback: string, passed: boolean,
  ): Promise<number> {
    const before = memoryStore.getStats(agentId).total;
    const content = `质量复盘：${taskTitle}，${score}分，${passed ? "通过" : "未通过"}。${feedback}`;
    memoryStore.add({
      agentId,
      type: "experience",
      content: content.slice(0, 240),
      keywords: this.extractKeywords(`${taskTitle} ${feedback}`),
      importance: passed ? 3 : 5,
      source: `supervisor:${taskTitle}`,
    });
    return memoryStore.getStats(agentId).total - before;
  }

  // ===== 私有 =====
  private extractKnowledge(output: string): string[] {
    const knowledge: string[] = [];
    
    // 检测关键词模式
    if (/项目|平台|系统|架构|设计|方案|API|接口|组件/g.test(output)) {
      knowledge.push(`技术知识：${output.slice(0, 60)}`);
    }
    if (/用户|客户|需求|偏好/g.test(output)) {
      knowledge.push(`用户洞察：${output.slice(0, 60)}`);
    }

    // 限制数量
    return knowledge.slice(0, 3);
  }

  private extractExplicitPreferences(text: string): string[] {
    const preferences: string[] = [];
    const normalized = text.replace(/\s+/g, " ").trim();
    if (/我(?:喜欢|偏好|希望|习惯)|不要|避免|必须|需要|更喜欢|风格/.test(normalized)) {
      preferences.push(`用户明确表达：${normalized.slice(0, 140)}`);
    }
    return preferences;
  }

  private extractKeywords(text: string): string[] {
    return [...new Set(text
      .replace(/[，。！？、；："“”'（）\s]/g, " ")
      .split(" ")
      .filter((word) => word.length >= 2))]
      .slice(0, 10);
  }

  private extractPreferences(description: string): string[] {
    const prefs: string[] = [];
    
    if (/简洁|直接|快速/g.test(description)) {
      prefs.push("用户偏好简洁高效的方式");
    }
    if (/详细|完整|全面/g.test(description)) {
      prefs.push("用户偏好详细完整的输出");
    }
    if (/品牌|风格|设计/g.test(description)) {
      prefs.push("用户关注品牌一致性和设计质量");
    }

    return prefs.slice(0, 2);
  }
}

export const memorySummarizer = new MemorySummarizer();
