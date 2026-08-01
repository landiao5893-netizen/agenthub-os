// ============================================
// OpenClawAdapter — OpenClaw Agent 接入适配器
// 当前阶段：框架预留，暂不连接真实服务
// ============================================

import {
  BaseAdapter,
  AdapterConfig,
  AdapterTaskInput,
  AdapterState,
} from "./base";

export class OpenClawAdapter extends BaseAdapter {
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
  // 配置（未来连接真实 OpenClaw 时填写）
  // ============================================
  private getOpenClawConfig() {
    return {
      endpoint: this.config.apiUrl ?? "https://api.openclaw.io/v1",
      apiToken: this.config.apiToken ?? process.env.OPENCLAW_API_TOKEN ?? "",
      remoteAgentId: this.config.remoteAgentId ?? this.config.agentId,
      timeoutMs: this.config.timeoutMs ?? 30000,
    };
  }

  // ============================================
  // 生命周期
  // ============================================
  async initialize(): Promise<void> {
    // TODO: 真实连接 OpenClaw Agent
    // const client = new OpenClawClient({ endpoint: cfg.endpoint, token: cfg.apiToken });
    // await client.authenticate();

    const cfg = this.getOpenClawConfig();
    this.connected = true;
    this.status.connected = true;

    this.emit({
      type: "connected",
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload: { message: `OpenClaw adapter ready → ${cfg.endpoint} [${cfg.remoteAgentId}]` },
    });
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    this.status.connected = false;

    this.emit({
      type: "disconnected",
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload: { message: "OpenClaw adapter disconnected" },
    });
  }

  // ============================================
  // 任务控制
  // ============================================
  async sendTask(task: AdapterTaskInput): Promise<void> {
    // TODO: 真实发送任务到 OpenClaw Agent
    // const session = await client.createSession({ agentId: cfg.remoteAgentId });
    // await session.send({
    //   type: "task",
    //   content: { title: task.title, description: task.description, input: task.input }
    // });

    this.status.currentTaskId = task.taskId;
    this.status.status = "THINKING";

    this.emit({
      type: "status_change",
      agentId: this.config.agentId,
      timestamp: Date.now(),
      payload: { status: "THINKING", progress: 5, message: `Task dispatched to OpenClaw: ${task.title}` },
    });
  }

  async getStatus(): Promise<AdapterState> {
    return { ...this.status, lastEvent: Date.now() };
  }

  async getResult(taskId: string): Promise<{ output?: string; error?: string }> {
    // TODO: 从 OpenClaw Agent Session 获取结果
    return { output: `[OpenClaw placeholder] Result for task ${taskId}` };
  }

  async stopTask(): Promise<void> {
    // TODO: 向 OpenClaw Agent 发送取消指令
    // await session.cancel();
    this.status.status = "IDLE";
    this.status.currentTaskId = null;
  }
}
