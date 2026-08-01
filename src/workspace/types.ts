// ============================================
// Shared Workspace — AI 团队协作空间
// 项目上下文共享 + 产出自动流转
// ============================================

// ============================================
// 工作空间条目
// ============================================
export type WorkspaceArtifactKind = "image" | "video" | "document" | "file";

export interface WorkspaceArtifact {
  id: string;
  name: string;
  kind: WorkspaceArtifactKind;
  mimeType: string;
  url: string;
  size?: number;
  createdAt: number;
}

export interface WorkspaceEntry {
  id: string;
  projectId: string;
  agentId: string;
  agentName: string;
  type: "task" | "output" | "file" | "decision" | "comment";
  title: string;
  content: string;
  parentId?: string;          // 关联的上游产出
  consumedBy: string[];       // 被哪些 Agent 读取了
  createdAt: number;
  updatedAt: number;
  tags: string[];
  status: "SUCCESS" | "FAILED";
  failureReason?: string;
  artifacts?: WorkspaceArtifact[];
}

// ============================================
// 项目工作空间
// ============================================
export interface SharedWorkspace {
  projectId: string;
  projectName: string;
  entries: WorkspaceEntry[];
  flowMap: Map<string, string[]>;  // agentId → [下游agentId列表]
  createdAt: number;
  updatedAt: number;
}

// ============================================
// 流转关系
// ============================================
export interface FlowRelation {
  from: string;    // 上游 agentId
  to: string;      // 下游 agentId
  autoForward: boolean;
  description: string;
}

// 预定义流转关系
export const DEFAULT_FLOWS: FlowRelation[] = [
  { from: "controller", to: "research-1",  autoForward: true, description: "Controller 拆解 → Research 调研" },
  { from: "controller", to: "design-1",    autoForward: true, description: "Controller 拆解 → Design 设计" },
  { from: "research-1",  to: "content-1",  autoForward: true, description: "Research 素材 → Content 文案" },
  { from: "research-1",  to: "design-1",   autoForward: true, description: "Research 数据 → Design 参考" },
  { from: "content-1",   to: "dev-1",      autoForward: true, description: "Content 文案 → Developer 组装" },
  { from: "design-1",    to: "dev-1",      autoForward: true, description: "Design 方案 → Developer 组装" },
  { from: "design-1",    to: "reviewer-1", autoForward: true, description: "Design 方案 → Reviewer 审核" },
  { from: "reviewer-1",  to: "controller", autoForward: true, description: "Reviewer 结果 → Controller 汇总" },
  { from: "dev-1",       to: "reviewer-1", autoForward: true, description: "Developer 交付结构 → Reviewer 审核" },
];

// ============================================
// 白板视图数据
// ============================================
export interface WhiteboardView {
  projectId: string;
  projectName: string;
  columns: WhiteboardColumn[];
}

export interface WhiteboardColumn {
  agentId: string;
  agentName: string;
  agentColor: string;
  entries: WorkspaceEntry[];
}
