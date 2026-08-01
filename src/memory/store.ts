// ============================================
// Memory Store — 按 Agent 隔离的本地持久化记忆
// ============================================

import { MemoryEntry, MemoryUpdateInput } from "./types";

const MEMORY_STORAGE_KEY = "ah_agent_memories_v3";
const LEGACY_MEMORY_STORAGE_KEY = "ah_agent_memories_v2";
const MEMORY_STORAGE_VERSION = 3;
const MAX_MEMORIES_PER_AGENT = 120;

type PersistedMemoryPayload = {
  version: number;
  entries: MemoryEntry[];
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

class MemoryStore {
  private memories: Map<string, MemoryEntry[]> = new Map();
  private counter = 0;
  private hydrated = false;

  /** 从本地存储恢复所有 Agent 的长期记忆 */
  hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    if (!canUseStorage()) return;

    try {
      window.localStorage.removeItem(LEGACY_MEMORY_STORAGE_KEY);
      const raw = window.localStorage.getItem(MEMORY_STORAGE_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw) as PersistedMemoryPayload;
      if (payload.version !== MEMORY_STORAGE_VERSION || !Array.isArray(payload.entries)) return;

      payload.entries.forEach((entry) => {
        if (!entry?.agentId || !entry.content || !entry.type) return;
        const memories = this.memories.get(entry.agentId) ?? [];
        memories.push(entry);
        this.memories.set(entry.agentId, memories);
      });
      this.counter = payload.entries.length;
    } catch {
      // Invalid or unavailable storage must not block Agent execution.
    }
  }

  /** 按 Agent 获取所有记忆 */
  getByAgent(agentId: string): MemoryEntry[] {
    this.hydrate();
    return this.memories.get(agentId) ?? [];
  }

  /** 按类型获取 */
  getByType(agentId: string, type: MemoryEntry["type"]): MemoryEntry[] {
    return this.getByAgent(agentId).filter(m => m.type === type);
  }

  /** 添加或合并记忆，避免同一经验反复堆积 */
  add(entry: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessed" | "accessCount">): MemoryEntry {
    this.hydrate();
    const agentMemories = this.memories.get(entry.agentId) ?? [];
    const fingerprint = this.fingerprint(entry.type, entry.content);
    const existing = agentMemories.find((memory) =>
      this.fingerprint(memory.type, memory.content) === fingerprint
    );

    if (existing) {
      existing.lastAccessed = Date.now();
      existing.accessCount += 1;
      existing.importance = Math.max(existing.importance, entry.importance);
      existing.keywords = [...new Set([...existing.keywords, ...entry.keywords])].slice(0, 12);
      this.persist();
      return existing;
    }

    const full: MemoryEntry = {
      ...entry,
      id: `mem-${++this.counter}-${Date.now()}`,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
    };
    this.memories.set(entry.agentId, this.trimMemories([...agentMemories, full]));
    this.persist();
    return full;
  }

  /** 批量添加 */
  addMany(entries: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessed" | "accessCount">[]): MemoryEntry[] {
    return entries.map(e => this.add(e));
  }

  /** 标记访问 */
  touch(id: string): void {
    for (const [, memories] of this.memories) {
      const m = memories.find(mm => mm.id === id);
      if (m) { m.lastAccessed = Date.now(); m.accessCount++; this.persist(); return; }
    }
  }

  /** 从任务更新中创建记忆 */
  fromTaskUpdate(input: MemoryUpdateInput): MemoryEntry[] {
    const entries: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessed" | "accessCount">[] = [];

    // 项目经验
    entries.push({
      agentId: input.agentId,
      type: "project",
      content: `${input.taskTitle}：${input.taskOutput.slice(0, 100)}`,
      keywords: this.extractKeywords(input.taskTitle + " " + input.taskDescription),
      importance: input.success ? 4 : 3,
      source: `task:${input.taskTitle}`,
    });

    // 新知识
    input.newKnowledge.forEach(k => {
      entries.push({
        agentId: input.agentId, type: "knowledge", content: k,
        keywords: this.extractKeywords(k), importance: 3, source: `task:${input.taskTitle}`,
      });
    });

    // 新偏好
    input.newPreferences.forEach(p => {
      entries.push({
        agentId: input.agentId, type: "preference", content: p,
        keywords: this.extractKeywords(p), importance: 4, source: `task:${input.taskTitle}`,
      });
    });

    // 新经验
    input.newFacts.forEach(f => {
      entries.push({
        agentId: input.agentId, type: "experience", content: f,
        keywords: this.extractKeywords(f), importance: 3, source: `task:${input.taskTitle}`,
      });
    });

    return this.addMany(entries);
  }

  /** 获取统计 */
  getStats(agentId: string) {
    const memories = this.getByAgent(agentId);
    return {
      total: memories.length,
      longTerm: memories.filter(m => m.type === "long_term").length,
      project: memories.filter(m => m.type === "project").length,
      knowledge: memories.filter(m => m.type === "knowledge").length,
      preference: memories.filter(m => m.type === "preference").length,
      experience: memories.filter(m => m.type === "experience").length,
      lastUpdated: memories.length > 0 ? Math.max(...memories.map(m => m.createdAt)) : 0,
    };
  }

  /** 清空 Agent 记忆 */
  clear(agentId: string): void {
    this.hydrate();
    this.memories.delete(agentId);
    this.persist();
  }

  // ===== 私有 =====
  private fingerprint(type: MemoryEntry["type"], content: string): string {
    return `${type}|${content.toLowerCase().replace(/\s+/g, " ").trim()}`;
  }

  private trimMemories(entries: MemoryEntry[]): MemoryEntry[] {
    if (entries.length <= MAX_MEMORIES_PER_AGENT) return entries;
    return [...entries]
      .sort((a, b) => b.importance - a.importance || b.lastAccessed - a.lastAccessed)
      .slice(0, MAX_MEMORIES_PER_AGENT);
  }

  private persist(): void {
    if (!canUseStorage()) return;
    try {
      const entries = Array.from(this.memories.values()).flat();
      const payload: PersistedMemoryPayload = { version: MEMORY_STORAGE_VERSION, entries };
      window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Memory remains available for the current session when storage is full.
    }
  }
  private extractKeywords(text: string): string[] {
    // 简单分词：中英文混合
    const words = text
      .replace(/[，。！？、；：""（）\s]/g, " ")
      .split(" ")
      .filter(w => w.length >= 2)
      .slice(0, 10);
    return [...new Set(words)];
  }
}

export const memoryStore = new MemoryStore();
let memoriesSeeded = false;

// ============================================
// 预置记忆（6 个 Agent 的初始经验）
// ============================================
export function seedMemories(): void {
  memoryStore.hydrate();
  if (memoriesSeeded) return;
  memoriesSeeded = true;

  const seeds: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessed" | "accessCount">[] = [
    { agentId: "controller", type: "long_term", content: "先确认目标、约束和交付标准，再拆解任务并选择合适员工", keywords: ["目标", "约束", "交付", "拆解"], importance: 4, source: "seed:v3" },
    { agentId: "research-1", type: "knowledge", content: "研究结论必须区分事实、推断和建议，并保留可核验来源", keywords: ["事实", "来源", "核验", "研究"], importance: 4, source: "seed:v3" },
    { agentId: "content-1", type: "knowledge", content: "内容产出应围绕目标受众、信息结构和交付格式组织", keywords: ["受众", "结构", "格式", "内容"], importance: 4, source: "seed:v3" },
    { agentId: "design-1", type: "knowledge", content: "设计方案应说明视觉方向、版式规则、素材要求和输出规格", keywords: ["视觉", "版式", "素材", "规格"], importance: 4, source: "seed:v3" },
    { agentId: "dev-1", type: "knowledge", content: "实现任务应先核对接口、依赖、验收条件和失败恢复路径", keywords: ["接口", "依赖", "验收", "恢复"], importance: 4, source: "seed:v3" },
    { agentId: "reviewer-1", type: "long_term", content: "审核必须依据明确标准给出问题、证据、影响和修改建议", keywords: ["审核", "证据", "影响", "建议"], importance: 4, source: "seed:v3" },
  ];
  memoryStore.addMany(seeds);
}
