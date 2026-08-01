// ============================================
// Knowledge Base — 企业知识库
// 文档存储 · 解析 · 索引 · 检索 · 权限
// ============================================

// ============================================
// 文档类型
// ============================================
export type DocumentType = "pdf" | "word" | "excel" | "image" | "markdown" | "text";

export interface KBDocument {
  id: string;
  title: string;
  type: DocumentType;
  content: string;            // 解析后的纯文本
  rawPath?: string;           // 原始文件路径
  parsedAt: number;
  tags: string[];             // 自动提取的标签
  category: string;           // 分类（项目资料/技术文档/品牌素材/合同文件）
  summary: string;            // 自动生成的摘要
  fileSize?: number;          // 字节
  pageCount?: number;
}

// ============================================
// 索引条目
// ============================================
export interface KBIndex {
  docId: string;
  keywords: string[];
  keywordPositions: Map<string, number[]>; // 关键词 → 位置
  category: string;
  importance: number;   // 1-5
  lastAccessed: number;
  accessCount: number;
}

// ============================================
// Agent 权限
// ============================================
export interface KBAccess {
  agentId: string;
  allowedCategories: string[];    // 可访问的分类
  allowedDocIds: string[];        // 可访问的特定文档
  deniedDocIds: string[];         // 禁止访问的文档
}

// 默认权限：每个 Agent 看自己能用的
export const DEFAULT_ACCESS: KBAccess[] = [
  { agentId: "controller", allowedCategories: ["全部"], allowedDocIds: [], deniedDocIds: [] },
  { agentId: "research-1", allowedCategories: ["项目资料","技术文档","品牌素材"], allowedDocIds: [], deniedDocIds: [] },
  { agentId: "content-1", allowedCategories: ["项目资料","品牌素材","合同文件"], allowedDocIds: [], deniedDocIds: [] },
  { agentId: "design-1", allowedCategories: ["品牌素材","项目资料"], allowedDocIds: [], deniedDocIds: [] },
  { agentId: "dev-1", allowedCategories: ["技术文档","项目资料"], allowedDocIds: [], deniedDocIds: [] },
  { agentId: "reviewer-1", allowedCategories: ["全部"], allowedDocIds: [], deniedDocIds: [] },
];

// ============================================
// 检索结果
// ============================================
export interface KBRetrievalResult {
  document: KBDocument;
  relevance: number;
  snippet: string;      // 匹配片段
  matchReason: string;
}
