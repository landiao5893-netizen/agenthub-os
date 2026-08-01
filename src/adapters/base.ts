// ============================================
// AgentHub OS — Agent Adapter Framework
// 统一智能体接入层接口
// ============================================

import { RuntimeStatus, ToolCallRecord, WorkLogEntry } from "@/types";

// ============================================
// Adapter 事件类型
// ============================================
export type AdapterEventType =
  | "status_change"
  | "task_progress"
  | "tool_call"
  | "log_entry"
  | "task_completed"
  | "task_error"
  | "connected"
  | "disconnected";

export interface AdapterEvent {
  type: AdapterEventType;
  agentId: string;
  timestamp: number;
  payload: {
    status?: RuntimeStatus;
    progress?: number;
    thinkingAbout?: string;
    toolCall?: ToolCallRecord;
    logEntry?: WorkLogEntry;
    message?: string;
    error?: string;
    output?: string;
  };
}

// ============================================
// Adapter 配置
// ============================================
export interface AdapterConfig {
  adapterId: string;
  agentId: string;
  provider: "mock" | "hermes" | "openclaw" | "openai" | "claude" | "deepseek" | "custom";
  // 通用配置
  enabled: boolean;
  providerConfigId?: string;
  // Hermes / OpenClaw / API 配置（Mock 不需要）
  apiUrl?: string;
  apiToken?: string;
  remoteAgentId?: string;
  model?: string;
  timeoutMs?: number;
}

// ============================================
// Task 输入（发给 Agent）
// ============================================
export interface AdapterTaskInput {
  taskId: string;
  title: string;
  description: string;
  input: string;
  priority: "low" | "medium" | "high";
  context?: string;
}

// ============================================
// Adapter 状态快照
// ============================================
export interface AdapterState {
  agentId: string;
  connected: boolean;
  status: RuntimeStatus;
  currentTaskId: string | null;
  progress: number;
  lastEvent: number;
}

// ============================================
// BaseAdapter 抽象接口
// ============================================
export abstract class BaseAdapter {
  config: AdapterConfig;
  protected listeners: Set<(event: AdapterEvent) => void> = new Set();

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  // ===== 生命周期 =====
  /** 初始化连接 */
  abstract initialize(): Promise<void>;

  /** 关闭连接 */
  abstract shutdown(): Promise<void>;

  // ===== 任务控制 =====
  /** 发送任务给 Agent */
  abstract sendTask(task: AdapterTaskInput): Promise<void>;

  /** 获取当前状态 */
  abstract getStatus(): Promise<AdapterState>;

  /** 获取任务结果 */
  abstract getResult(taskId: string): Promise<{ output?: string; error?: string }>;

  /** 停止当前任务 */
  abstract stopTask(): Promise<void>;

  // ===== 事件订阅 =====
  /** 注册事件监听器 */
  onEvent(handler: (event: AdapterEvent) => void): () => void {
    this.listeners.add(handler);
    return () => { this.listeners.delete(handler); };
  }

  /** 发射事件 */
  protected emit(event: AdapterEvent): void {
    this.listeners.forEach(h => {
      try { h(event); } catch { /* 静默错误 */ }
    });
  }
}

export type AdapterProvider = "mock" | "hermes" | "openclaw" | "openai" | "claude" | "deepseek" | "custom";
