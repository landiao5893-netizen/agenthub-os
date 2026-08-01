// ============================================
// AgentHub OS — Type Definitions
// ============================================

// Agent 内部状态（不直接展示给用户）
export type AgentInternalStatus = "IDLE" | "THINKING" | "WORKING" | "TOOL_CALL" | "WAITING" | "DONE" | "ERROR";

// Agent 用户可见状态（自然语言）
export type AgentUserStatus =
  | "空闲"
  | "正在分析任务"
  | "正在阅读资料"
  | "正在调用工具"
  | "正在生成结果"
  | "等待协作"
  | "已完成"
  | "异常";

export const STATUS_MAP: Record<AgentInternalStatus, AgentUserStatus> = {
  IDLE: "空闲",
  THINKING: "正在分析任务",
  WORKING: "正在阅读资料",
  TOOL_CALL: "正在调用工具",
  WAITING: "等待协作",
  DONE: "已完成",
  ERROR: "异常",
};

export type AgentRole = "controller" | "research" | "content" | "design" | "developer" | "reviewer" | "analyst";

// ============================================
// Agent 基础配置（列表展示用）
// ============================================
export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  roleLabel: string;
  model: string;
  skills: string[];
  tools: string[];
  avatar: string;
  color: string;
}

// ============================================
// Agent 完整档案（详情页用）
// ============================================
export interface AgentSkill {
  name: string;
  level: number; // 1-5
  description: string;
}

export interface AgentTool {
  name: string;
  icon: string;     // emoji
  granted: boolean;
  description: string;
}

export interface AgentMemory {
  longTerm: string[];
  projectExperience: {
    name: string;
    role: string;
    outcome: string;
  }[];
  knowledge: string[];
}

export interface AgentPerformance {
  tasksCompleted: number;
  projectsCount: number;
  successRate: number;
  rating: number; // 1-5
  recentProjects: string[];
}

export interface AgentProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;           // 职位
  department: string;       // 部门
  roleDescription: string;  // 角色描述
  model: string;
  color: string;
  skills: AgentSkill[];
  tools: AgentTool[];
  memory: AgentMemory;
  performance: AgentPerformance;
  status: AgentInternalStatus;
  currentTask: string | null;
  createdAt: string;
}

// ============================================
// 运行时状态
// ============================================
export interface AgentRuntime {
  agentId: string;
  internalStatus: AgentInternalStatus;
  currentTask: string | null;
  progress: number;
  lastActive: Date;
  messages: number;
}

// ============================================
// 聊天消息
// ============================================
export interface ChatMessage {
  id: string;
  agentId: string;
  content: string;
  type: "text" | "tool_call" | "log" | "system";
  role?: "user" | "agent" | "tool";
  channel?: "discussion" | "execution" | "private";
  timestamp: Date;
  toolName?: string;
  toolResult?: string;
}

// ============================================
// 工作流
// ============================================
export interface WorkflowNode {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  assignedAgent?: string;
  progress: number;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: { from: string; to: string }[];
}

// ============================================
// 事件日志
// ============================================
export interface EventLog {
  id: string;
  timestamp: Date;
  agentId: string;
  event: string;
  detail: string;
  level: "info" | "warn" | "error" | "success";
}

// ============================================
// Agent Runtime Layer — 运行时
// ============================================

export type RuntimeStatus =
  | "IDLE"
  | "THINKING"
  | "PLANNING"
  | "WORKING"
  | "TOOL_CALL"
  | "WAITING"
  | "COMPLETED"
  | "ERROR";

export const RUNTIME_STATUS_LABEL: Record<RuntimeStatus, string> = {
  IDLE: "空闲",
  THINKING: "思考中",
  PLANNING: "规划中",
  WORKING: "执行中",
  TOOL_CALL: "调用工具",
  WAITING: "等待协作",
  COMPLETED: "已完成",
  ERROR: "异常",
};

export interface TaskContext {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  priority: "low" | "medium" | "high";
  createdAt: number;
  deadline?: number;
  input: string;
  output?: string;
  dependencies: string[];
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  icon: string;
  input: string;
  output: string;
  status: "running" | "success" | "error";
  timestamp: number;
  durationMs: number;
}

export interface WorkLogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

export interface AgentRuntimeState {
  runtimeId: string;
  agentId: string;
  status: RuntimeStatus;
  currentTask: TaskContext | null;
  thinkingAbout: string;
  recentActions: string[];
  blockedBy: string | null;
  toolHistory: ToolCallRecord[];
  workLog: WorkLogEntry[];
  taskProgress: number;
  context: string;
  startedAt: number;
  endTime: number | null;
  estimatedRemaining: number;
}

