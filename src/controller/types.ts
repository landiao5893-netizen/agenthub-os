// ============================================
// Controller Agent — 总控智能体类型定义
// ============================================

import { RuntimeStatus } from "@/types";

// ============================================
// 任务分析结果（Mock LLM 输出）
// ============================================
export interface TaskAnalysis {
  intent: string;                    // 用户意图摘要
  domain: string;                    // 领域分类
  complexity: "simple" | "medium" | "complex";
  suggestedAgents: string[];         // 推荐 Agent ID 列表
  subtasks: SubTaskDef[];            // 子任务定义
  dag: DAGEdge[];                    // 依赖关系
  estimatedMinutes: number;          // 预估总耗时
}

export interface SubTaskDef {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;             // agentId
  priority: "low" | "medium" | "high";
  input: string;                     // 给 Agent 的输入
  dependsOn: string[];               // 依赖的子任务 ID
  expectedOutput: string;            // 预期产出
}

export interface DAGEdge {
  from: string;                      // subtask id
  to: string;                        // subtask id
}

// ============================================
// 项目
// ============================================
export type ProjectStatus = "planning" | "executing" | "reviewing" | "completed" | "failed" | "success" | "partial_success" | "waiting_recovery";

export interface Project {
  id: string;
  name: string;
  description: string;
  userRequest: string;               // 原始用户输入
  analysis: TaskAnalysis;            // Controller 分析结果
  status: ProjectStatus;
  progress: number;                  // 0-100
  subtasks: ProjectTask[];           // 子任务执行状态
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  controllerLog: ControllerLogEntry[];
}

export interface ProjectTask {
  subtaskDef: SubTaskDef;
  status: "pending" | "assigned" | "running" | "completed" | "failed";
  agentRuntimeStatus?: RuntimeStatus;
  progress: number;
  output?: string;
  startedAt?: number;
  completedAt?: number;
}

// ============================================
// Controller 工作日志
// ============================================
export interface ControllerLogEntry {
  id: string;
  timestamp: number;
  phase: ControllerPhase;
  message: string;
  detail?: string;
}

export type ControllerPhase =
  | "receiving"       // 接收需求
  | "analyzing"       // 分析任务
  | "planning"        // 规划分解
  | "selecting"       // 选择 Agent
  | "building_dag"    // 构建 DAG
  | "dispatching"     // 分发任务
  | "monitoring"      // 监督执行
  | "collecting"      // 收集结果
  | "synthesizing"    // 汇总输出
  | "completed";      // 完成

export const CONTROLLER_PHASE_LABEL: Record<ControllerPhase, string> = {
  receiving: "接收需求",
  analyzing: "分析任务",
  planning: "规划分解",
  selecting: "选择 Agent",
  building_dag: "构建 DAG",
  dispatching: "分发任务",
  monitoring: "监督执行",
  collecting: "收集结果",
  synthesizing: "汇总输出",
  completed: "已完成",
};

// ============================================
// Controller 状态
// ============================================
export interface ControllerState {
  currentProject: Project | null;
  phase: ControllerPhase;
  isActive: boolean;
  log: ControllerLogEntry[];
}
