import { BaseAdapter, type AdapterConfig, type AdapterState, type AdapterTaskInput } from "./base";

export class DirectLLMAdapter extends BaseAdapter {
  private state: AdapterState;
  private results = new Map<string, { output?: string; error?: string }>();
  private controller: AbortController | null = null;

  constructor(config: AdapterConfig) {
    super(config);
    this.state = {
      agentId: config.agentId,
      connected: Boolean((config.providerConfigId || config.apiToken) && config.model),
      status: "IDLE",
      currentTaskId: null,
      progress: 0,
      lastEvent: Date.now(),
    };
  }

  async initialize() {
    this.state.connected = Boolean((this.config.providerConfigId || this.config.apiToken) && this.config.model);
  }

  async shutdown() {
    this.controller?.abort();
    this.state.connected = false;
    this.state.status = "IDLE";
  }

  async sendTask(task: AdapterTaskInput) {
    this.controller = new AbortController();
    this.state = { ...this.state, status: "WORKING", currentTaskId: task.taskId, progress: 20, lastEvent: Date.now() };
    this.emit({ type: "status_change", agentId: this.config.agentId, timestamp: Date.now(), payload: { status: "WORKING", progress: 20 } });
    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: [task.title, task.description, task.context, task.input].filter(Boolean).join("\n\n"),
          provider: this.config.provider,
          providerConfigId: this.config.providerConfigId,
          model: this.config.model,
          apiUrl: this.config.apiUrl,
          apiToken: this.config.apiToken,
          timeout_ms: this.config.timeoutMs ?? 90000,
        }),
        signal: this.controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.error ?? `API ${response.status}`);
      this.results.set(task.taskId, { output: payload.output });
      this.state = { ...this.state, status: "COMPLETED", progress: 100, lastEvent: Date.now() };
      this.emit({ type: "task_completed", agentId: this.config.agentId, timestamp: Date.now(), payload: { status: "COMPLETED", progress: 100, output: payload.output } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.results.set(task.taskId, { error: message });
      this.state = { ...this.state, status: "ERROR", progress: 85, lastEvent: Date.now() };
      this.emit({ type: "task_error", agentId: this.config.agentId, timestamp: Date.now(), payload: { status: "ERROR", error: message } });
    }
  }

  async getStatus() { return { ...this.state }; }
  async getResult(taskId: string) { return this.results.get(taskId) ?? { error: "结果不存在" }; }
  async stopTask() {
    this.controller?.abort();
    this.state = { ...this.state, status: "IDLE", currentTaskId: null, progress: 0, lastEvent: Date.now() };
  }
}
