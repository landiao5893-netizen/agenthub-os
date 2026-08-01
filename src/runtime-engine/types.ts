// ============================================
// Agent Runtime Engine — 类型定义
// 让 AI 员工可以真实执行任务
// ============================================

import { AgentProfile, AgentSkill, AgentTool, AgentMemory, AgentPerformance } from "@/types";
import { AgentConstitution } from "@/constitution/data";

// ============================================
// 执行上下文 — 组合所有 Agent 数据
// ============================================
export interface AgentContext {
  profile: AgentProfile;
  skills: AgentSkill[];
  tools: AgentTool[];
  memory: AgentMemory;
  performance: AgentPerformance;
  constitution: AgentConstitution;
  task: ExecutionTask;
  /** 动态检索的相关记忆（Memory Engine 注入） */
  retrievedMemory?: string;
}

export interface ExecutionTask {
  id: string;
  title: string;
  description: string;
  input: string;
  priority: "low" | "medium" | "high";
  assignedBy: string;
  deadline?: number;
}

// ============================================
// 组装后的提示词
// ============================================
export interface AssembledPrompt {
  systemPrompt: string;
  taskPrompt: string;
  toolDefinitions: ToolDefinition[];
  rules: string[];
  context: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

// ============================================
// 执行阶段
// ============================================
export type ExecutionPhase =
  | "received"       // 收到任务
  | "context_load"   // 加载上下文
  | "rule_check"     // 检查宪法
  | "thinking"       // 思考分析
  | "tool_call"      // 调用工具
  | "executing"      // 执行中
  | "output"         // 输出结果
  | "completed"      // 完成
  | "waiting_clarification" // 等待澄清
  | "error";         // 异常

export const EXECUTION_PHASE_LABEL: Record<ExecutionPhase, string> = {
  received: "收到任务",
  context_load: "加载上下文",
  rule_check: "读取规则",
  thinking: "思考分析",
  tool_call: "调用工具",
  executing: "执行中",
  output: "输出结果",
  completed: "完成",
  waiting_clarification: "等待澄清",
  error: "异常",
};

// ============================================
// 执行时间线条目
// ============================================
export interface TimelineEntry {
  id: string;
  timestamp: number;
  phase: ExecutionPhase;
  message: string;
  detail?: string;
  toolUsed?: string;
  durationMs?: number;
}

// ============================================
// 执行结果
// ============================================
export interface ExecutionResult {
  taskId: string;
  agentId: string;
  success: boolean;
  status?: "completed" | "failed" | "waiting_clarification";
  clarification?: { question: string; choices?: string[] };
  output: string;
  timeline: TimelineEntry[];
  toolCalls: number;
  totalDurationMs: number;
  startedAt: number;
  completedAt: number;
}

// ============================================
// Runtime Adapter 接口
// ============================================
export interface RuntimeAdapter {
  readonly name: string;
  readonly type: "mock" | "hermes" | "openclaw" | "llm";

  /** 执行任务 */
  execute(context: AgentContext): AsyncGenerator<TimelineEntry, ExecutionResult, void>;

  /** 停止执行 */
  abort(): void;
}
