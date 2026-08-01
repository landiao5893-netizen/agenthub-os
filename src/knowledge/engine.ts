// ============================================
// Knowledge Base Engine — 存储 · 索引 · 检索 · 权限
// ============================================

import { KBDocument, KBIndex, KBRetrievalResult, KBAccess, DEFAULT_ACCESS, DocumentType } from "./types";
import { documentParser } from "./parsers";

const KB_ACCESS_STORAGE_KEY = "ah_kb_access_v1";

class KnowledgeBaseEngine {
  private documents: Map<string, KBDocument> = new Map();
  private indexes: Map<string, KBIndex> = new Map();
  private access: Map<string, KBAccess> = new Map();
  private accessHydrated = false;

  constructor() {
    DEFAULT_ACCESS.forEach(a => this.access.set(a.agentId, a));
  }

  private hydrateAccess(): void {
    if (this.accessHydrated) return;
    this.accessHydrated = true;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KB_ACCESS_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) as KBAccess[] : [];
      if (Array.isArray(saved)) saved.forEach((item) => item?.agentId && this.access.set(item.agentId, item));
    } catch {
      // Keep default access when persisted settings are invalid.
    }
  }

  private persistAccess(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KB_ACCESS_STORAGE_KEY, JSON.stringify(Array.from(this.access.values())));
    } catch {
      // Keep access settings for the current session.
    }
  }

  // ===== 文档管理 =====
  async addDocument(title: string, type: DocumentType, rawContent: string, rawPath?: string): Promise<KBDocument> {
    const doc = await documentParser.createDocument(title, type, rawContent, rawPath);
    this.documents.set(doc.id, doc);
    this.indexDocument(doc);
    return doc;
  }

  getAll(): KBDocument[] {
    return [...this.documents.values()];
  }

  getByCategory(category: string): KBDocument[] {
    return this.getAll().filter(d => d.category === category);
  }

  get(docId: string): KBDocument | undefined {
    return this.documents.get(docId);
  }

  delete(docId: string): boolean {
    this.indexes.delete(docId);
    return this.documents.delete(docId);
  }

  // ===== 索引 =====
  private indexDocument(doc: KBDocument): void {
    const keywords = new Set<string>();
    const positions = new Map<string, number[]>();

    // 提取关键词
    const words = doc.content
      .replace(/[，。！？、；：""（）【】\s]/g, " ")
      .split(" ")
      .filter(w => w.length >= 2);

    words.forEach((word, i) => {
      keywords.add(word);
      if (!positions.has(word)) positions.set(word, []);
      positions.get(word)!.push(i);
    });

    // 也加入标签
    doc.tags.forEach(t => keywords.add(t));

    this.indexes.set(doc.id, {
      docId: doc.id,
      keywords: [...keywords].slice(0, 100),
      keywordPositions: positions,
      category: doc.category,
      importance: doc.tags.length > 2 ? 4 : 3,
      lastAccessed: Date.now(),
      accessCount: 0,
    });
  }

  // ===== 检索 =====
  retrieve(agentId: string, query: string, maxResults: number = 5): KBRetrievalResult[] {
    this.hydrateAccess();
    const access = this.access.get(agentId);
    if (!access) return [];

    const queryKeywords = query
      .replace(/[，。！？、；：""（）【】\s]/g, " ")
      .split(" ")
      .filter(w => w.length >= 2);

    const results: KBRetrievalResult[] = [];

    for (const [docId, index] of this.indexes) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      // 权限检查
      if (!this.canAccess(agentId, doc)) continue;

      // 相关性计算
      let relevance = 0;
      const hits: string[] = [];

      for (const kw of queryKeywords) {
        const kwl = kw.toLowerCase();
        // 关键词匹配
        if (index.keywords.some((k: string) => k.toLowerCase().includes(kwl))) {
          relevance += 0.3;
          hits.push(kw);
        }
        // 内容匹配
        if (doc.content.toLowerCase().includes(kwl)) {
          relevance += 0.2;
        }
        // 标签匹配
        if (doc.tags.some(t => t.toLowerCase().includes(kwl))) {
          relevance += 0.25;
        }
      }

      // 分类权重
      if (doc.category === "项目资料") relevance += 0.1;

      if (relevance > 0) {
        relevance = Math.min(1, relevance);
        
        // 生成摘要片段
        const snippet = this.generateSnippet(doc.content, queryKeywords);

        results.push({
          document: doc,
          relevance: Math.round(relevance * 100) / 100,
          snippet,
          matchReason: hits.length > 0 ? `命中 ${hits.length} 个关键词` : "分类匹配",
        });

        index.lastAccessed = Date.now();
        index.accessCount++;
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  /** 获取检索上下文（注入 Context Builder） */
  getContextForTask(agentId: string, taskTitle: string, taskDescription: string): string {
    const results = this.retrieve(agentId, `${taskTitle} ${taskDescription}`, 3);
    if (results.length === 0) return "";

    return results
      .map(r => `[知识库] ${r.document.title}\n${r.snippet}`)
      .join("\n\n");
  }

  // ===== 权限 =====
  canAccess(agentId: string, doc: KBDocument): boolean {
    const access = this.access.get(agentId);
    if (!access) return false;

    // 拒绝列表优先
    if (access.deniedDocIds.includes(doc.id)) return false;

    // 明确允许
    if (access.allowedDocIds.includes(doc.id)) return true;

    // 分类检查
    if (access.allowedCategories.includes("全部")) return true;
    if (access.allowedCategories.includes(doc.category)) return true;

    return false;
  }

  getAccess(agentId: string): KBAccess | undefined {
    this.hydrateAccess();
    return this.access.get(agentId);
  }

  setAccess(agentId: string, access: KBAccess): void {
    this.hydrateAccess();
    this.access.set(agentId, access);
    this.persistAccess();
  }

  // ===== 统计 =====
  getStats() {
    const docs = this.getAll();
    return {
      total: docs.length,
      byCategory: {
        项目资料: docs.filter(d => d.category === "项目资料").length,
        技术文档: docs.filter(d => d.category === "技术文档").length,
        品牌素材: docs.filter(d => d.category === "品牌素材").length,
        合同文件: docs.filter(d => d.category === "合同文件").length,
      },
      byType: {
        pdf: docs.filter(d => d.type === "pdf").length,
        word: docs.filter(d => d.type === "word").length,
        excel: docs.filter(d => d.type === "excel").length,
        markdown: docs.filter(d => d.type === "markdown").length,
        image: docs.filter(d => d.type === "image").length,
      },
      indexedCount: this.indexes.size,
    };
  }

  // ===== 辅助 =====
  private generateSnippet(content: string, keywords: string[]): string {
    const clean = content.replace(/\s+/g, " ").trim();
    if (clean.length <= 200) return clean;

    // 找第一个关键词出现的位置
    for (const kw of keywords) {
      const idx = clean.toLowerCase().indexOf(kw.toLowerCase());
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(clean.length, idx + 150);
        return (start > 0 ? "..." : "") + clean.slice(start, end) + (end < clean.length ? "..." : "");
      }
    }
    return clean.slice(0, 200) + "...";
  }
}

export const kbEngine = new KnowledgeBaseEngine();
let knowledgeBaseSeedPromise: Promise<void> | null = null;

// ============================================
// 预置知识库文档
// ============================================
export function seedKnowledgeBase(): Promise<void> {
  if (knowledgeBaseSeedPromise) return knowledgeBaseSeedPromise;

  const seeds: [string, DocumentType, string][] = [
    ["贵州城市产品手册设计规范", "markdown", `# 贵州城市产品手册设计规范\n\n## 品牌定位\n高端生活方式品牌，目标客群都市中产。\n\n## 设计要求\n- Dark Glassmorphism 风格\n- 蓝紫渐变主色调\n- 避免电竞和传统企业风格\n- 参考 Linear / Notion / Apple Vision Pro\n\n## 内容结构\n1. 城市导语\n2. 特色推荐\n3. 品牌故事\n4. 视觉方案`],
    ["商用厨房设备规格参数", "excel", `型号\t功率\t尺寸\t重量\t价格\nCX-100\t5KW\t1200x800x800\t180kg\t12000\nCX-200\t8KW\t1500x900x850\t220kg\t16800\nCX-300\t12KW\t1800x1000x900\t280kg\t22800`],
    ["AgentHub OS 技术架构文档", "markdown", `# AgentHub OS 技术架构\n\n## 技术栈\n- Next.js 14 + React 18 + TypeScript\n- Tailwind CSS + Framer Motion\n- Zustand 状态管理\n\n## 目录结构\n- components/ 10个模块\n- controller/ 总控引擎\n- runtime-engine/ 运行时引擎\n- memory/ 记忆系统\n- supervisor/ 监督系统`],
    ["品牌色彩系统指南", "markdown", `# 品牌色彩系统\n\n## 主色\n- 紫色 #8b5cf6 (Primary)\n- 蓝色 #3b82f6 (Secondary)\n\n## 辅助色\n- 青色 #06b6d4\n- 翠绿 #10b981\n- 玫瑰 #f43f5e\n\n## 使用规范\n60% 主色 + 30% 辅助色 + 10% 强调色`],
    ["合同审核要点清单", "markdown", `# 合同审核要点\n\n## 必查项\n1. 争议解决地条款\n2. 验收标准与条件\n3. 违约金比例（重点：超过20%需谈判）\n4. 知识产权归属\n\n## 建议项\n- 付款节点\n- 质保期限\n- 售后条款`],
  ];

  knowledgeBaseSeedPromise = Promise.all(
    seeds.map(([title, type, content]) => kbEngine.addDocument(title, type, content))
  ).then(() => undefined).catch((error) => {
    knowledgeBaseSeedPromise = null;
    throw error;
  });
  return knowledgeBaseSeedPromise;
}
