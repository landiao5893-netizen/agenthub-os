import { AgentConfig, AgentRuntime, ChatMessage, Workflow, EventLog, AgentInternalStatus } from "@/types";

// ============================================
// Mock Agent 配置（精简）
// ============================================
export const MOCK_AGENTS: AgentConfig[] = [
  { id: "controller", name: "Controller Agent", role: "controller", roleLabel: "总控调度", model: "deepseek-v4-flash", skills: ["任务拆解","流程规划","结果审核"], tools: ["orchestrator","planner"], avatar: "🧠", color: "#8b5cf6" },
  { id: "research-1", name: "Research Agent", role: "research", roleLabel: "情报研究", model: "deepseek-v4-flash", skills: ["信息检索","数据分析"], tools: ["web_search","web_extract"], avatar: "🔍", color: "#3b82f6" },
  { id: "content-1", name: "Content Agent", role: "content", roleLabel: "内容创作", model: "deepseek-v4-flash", skills: ["文案撰写","多语言翻译"], tools: ["text_generation"], avatar: "✍️", color: "#06b6d4" },
  { id: "design-1", name: "Design Agent", role: "design", roleLabel: "视觉设计", model: "deepseek-v4-flash", skills: ["UI设计","图像生成"], tools: ["image_gen","svg_generate"], avatar: "🎨", color: "#f59e0b" },
  { id: "dev-1", name: "Developer Agent", role: "developer", roleLabel: "代码开发", model: "deepseek-v4-flash", skills: ["代码生成","代码审查"], tools: ["code_generate","terminal","github"], avatar: "⚡", color: "#10b981" },
  { id: "reviewer-1", name: "Reviewer Agent", role: "reviewer", roleLabel: "质量审核", model: "deepseek-v4-pro", skills: ["内容审核","质量把关"], tools: ["quality_check","audit"], avatar: "🛡️", color: "#f43f5e" },
];

// 精简初始运行时（全空闲）
export const MOCK_AGENT_RUNTIMES: AgentRuntime[] = MOCK_AGENTS.map(a => ({
  agentId: a.id, internalStatus: "IDLE" as AgentInternalStatus,
  currentTask: null, progress: 0, lastActive: new Date(0), messages: 0,
}));

// 最少聊天消息
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  { id: "m1", agentId: "controller", content: "AgentHub OS 就绪。输入任务开始协作。", type: "text", timestamp: new Date(0) },
];

// 工作流
export const MOCK_WORKFLOW: Workflow = {
  id: "wf-1", name: "AgentHub OS UI 原型开发",
  nodes: [
    { id: "n1", label: "需求分析", status: "active", assignedAgent: "controller", progress: 100 },
    { id: "n2", label: "竞品调研", status: "pending", assignedAgent: "research-1", progress: 0 },
    { id: "n3", label: "视觉设计", status: "pending", assignedAgent: "design-1", progress: 0 },
    { id: "n4", label: "前端开发", status: "pending", assignedAgent: "dev-1", progress: 0 },
    { id: "n5", label: "质量审核", status: "pending", assignedAgent: "reviewer-1", progress: 0 },
  ],
  edges: [{ from: "n1", to: "n2" }, { from: "n2", to: "n3" }, { from: "n3", to: "n4" }, { from: "n4", to: "n5" }],
};

// 最少事件日志
export const MOCK_EVENT_LOGS: EventLog[] = [
  { id: "e1", timestamp: new Date(), agentId: "controller", event: "系统就绪", detail: "AgentHub OS 初始化完成", level: "success" },
];

export function getNextStatus(): AgentInternalStatus { return "IDLE"; }
export { STATUS_MAP } from "@/types";
