// ============================================
// Memory Engine — AI 员工长期经验系统
// ============================================

// ============================================
// 记忆条目类型
// ============================================
export interface MemoryEntry {
  id: string;
  agentId: string;
  type: "long_term" | "project" | "knowledge" | "preference" | "experience";
  content: string;
  keywords: string[];         // 检索关键词
  context?: string;           // 相关上下文
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  importance: number;         // 1-5 重要性评分
  source: string;             // 记忆来源（任务ID / 手动添加）
}

// ============================================
// 检索结果
// ============================================
export interface MemoryRetrievalResult {
  entry: MemoryEntry;
  relevance: number;          // 0-1 相关度
  matchReason: string;        // 匹配原因
}

// ============================================
// 记忆更新输入
// ============================================
export interface MemoryUpdateInput {
  agentId: string;
  taskTitle: string;
  taskDescription: string;
  taskOutput: string;
  success: boolean;
  newFacts: string[];          // 学到的新事实
  newPreferences: string[];    // 发现的新偏好
  newKnowledge: string[];      // 获得的新知识
}
