// ============================================
// Supervisor Agent + Quality Gate — 类型定义
// ============================================

import { AgentInternalStatus } from "@/types";

// ============================================
// 质量评分
// ============================================
export interface QualityScore {
  agentId: string;
  agentName: string;
  taskTitle: string;
  dimensions: QualityDimension[];
  totalScore: number;       // 0-100
  passed: boolean;          // >= 70 通过
  status: "PASS" | "FAIL" | "WARN";
  feedback: string;
  checkedAt: number;
}

export interface QualityDimension {
  name: string;
  score: number;            // 0-100
  weight: number;           // 权重
  comment: string;
}

// 质量维度定义
export const QUALITY_DIMENSIONS = [
  { name: "完整性", key: "completeness",  weight: 0.25, description: "是否覆盖了任务要求的所有要点" },
  { name: "准确性", key: "accuracy",      weight: 0.20, description: "内容是否准确、事实正确" },
  { name: "任务符合度", key: "taskFit",   weight: 0.25, description: "输出是否符合任务预期" },
  { name: "宪法合规", key: "constitution",weight: 0.15, description: "是否遵守 Agent 工作宪法" },
  { name: "偏好匹配", key: "preference",  weight: 0.15, description: "是否符合用户偏好" },
];

// ============================================
// 失败恢复策略
// ============================================
export type FailureType = "api_error" | "empty_output" | "quality_low" | "timeout" | "unknown";

export interface RecoveryAction {
  type: "retry" | "reprompt" | "switch_model" | "switch_agent" | "delegate";
  reason: string;
  attemptsRemaining: number;
  targetAgentId: string;
  modifiedPrompt?: string;
  targetModel?: string;
}

export const MAX_RETRY_ATTEMPTS = 3;

// ============================================
// Supervisor 状态
// ============================================
export interface AgentSupervision {
  agentId: string;
  agentName: string;
  currentStatus: AgentInternalStatus;
  taskTitle: string;
  qualityScore: QualityScore | null;
  attempts: number;
  lastError?: string;
  supervisorNote?: string;
}

export interface SupervisorState {
  isActive: boolean;
  projectId: string | null;
  projectName: string;
  supervisedAgents: AgentSupervision[];
  gatesPassed: number;
  gatesFailed: number;
  recoveryAttempts: number;
  log: SupervisorLogEntry[];
}

export interface SupervisorLogEntry {
  id: string;
  timestamp: number;
  type: "gate_check" | "recovery" | "pass" | "fail" | "retry" | "info";
  agentId: string;
  message: string;
  detail?: string;
}
