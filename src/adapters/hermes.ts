// ============================================
// HermesAdapter — Hermes Agent 接入适配器
// 当前阶段：框架预留，暂不连接真实服务
// ============================================

import {
  BaseAdapter,
  AdapterConfig,
  AdapterTaskInput,
  AdapterState,
} from "./base";

export class HermesAdapter extends BaseAdapter {
  private connected = false;
  private status: AdapterState;

  constructor(config: AdapterConfig) {
    super(config);
    this.status = {
      agentId: config.agentId,
      connected: false,
      status: "IDLE",
      currentTaskId: null,
      progress: 0,
      lastEvent: Date.now(),
    };
  }

  // ============================================
  // 配置（未来连接真实 Hermes 时填写）
  // ============================================
  private getHermesConfig() {
    return {
      apiUrl: this.config.apiUrl ?? "http://localhost:8080/api/hermes",
      apiToken: this.config.apiToken ?? process.env.HERMES_API_TOKEN ?? "",
      remoteAgentId: this.config.remoteAgentId ?? this.config.agentId,
      model: this.config.model ?? "deepseek-v4-flash",
      timeoutMs: this.config.timeoutMs ?? 30000,
    };
  }

  // ============================================
  // 生命周期
  // ============================================
  async initialize(): Promise<void> {
    // TODO: 真实连接 Hermes Agent
    // const response = await fetch(`${cfg.apiUrl}/agents/${cfg.remoteAgentId}/connect`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${cfg.apiToken}` },
    // });

    // 占位：标记已连接
    const cfg = this.getHermesConfig();
    this.connected = true;
    this.status.connected = true;

    this.emit({
      type: "connected",
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload: { message: `Hermes adapter ready → ${cfg.apiUrl} [${cfg.remoteAgentId}]` },
    });
  }

  async shutdown(): Promise<void> {
    // TODO: 断开 Hermes Agent 连接
    this.connected = false;
    this.status.connected = false;

    this.emit({
      type: "disconnected",
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload: { message: "Hermes adapter disconnected" },
    });
  }

  // ============================================
  // 任务控制
  // ============================================
  async sendTask(task: AdapterTaskInput): Promise<void> {
    // TODO: 真实发送任务到 Hermes Agent
    // const response = await fetch(`${cfg.apiUrl}/agents/${cfg.remoteAgentId}/tasks`, {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${cfg.apiToken}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     taskId: task.taskId,
    //     title: task.title,
    //     description: task.description,
    //     input: task.input,
    //     model: cfg.model,
    //   }),
    //   signal: AbortSignal.timeout(cfg.timeoutMs),
    // });

    this.status.currentTaskId = task.taskId;
    this.status.status = "THINKING";

    this.emit({
      type: "status_change",
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload: { status: "THINKING", progress: 5, message: `Task sent to Hermes: ${task.title}` },
    });
  }

  async getStatus(): Promise<AdapterState> {
    return { ...this.status, lastEvent: Date.now() };
  }

  async getResult(taskId: string): Promise<{ output?: string; error?: string }> {
    // TODO: 从 Hermes Agent 获取任务结果
    return { output: `[Hermes placeholder] Result for task ${taskId}` };
  }

  async stopTask(): Promise<void> {
    // TODO: 向 Hermes Agent 发送停止指令
    this.status.status = "IDLE";
    this.status.currentTaskId = null;
  }

  // ============================================
  // 事件流（TODO: 连接 Hermes WebSocket/SSE）
  // ============================================
  // 真实实现需要：
  // 1. 建立 WebSocket 连接到 `${cfg.apiUrl}/agents/${cfg.remoteAgentId}/events`
  // 2. 监听 Hermes 推送的 status/progress/tool_call/log 事件
  // 3. 通过 this.emit() 转发到 AgentHub 内部
}
