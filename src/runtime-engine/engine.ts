// ============================================
// Runtime Engine — 统一执行入口
// Context → Adapter → Timeline → Result
// ============================================

import { ExecutionTask, ExecutionResult, TimelineEntry, RuntimeAdapter } from "./types";
import { contextBuilder } from "./context-builder";
import { MockRuntime } from "./adapters/mock";
import { HermesRuntime } from "./adapters/hermes";
import { OpenClawRuntime } from "./adapters/openclaw";
import { LLMRuntime } from "./adapters/llm";
import { memorySummarizer } from "@/memory/summarizer";

// ============================================
// Runtime Engine
// ============================================
type ExecutionListener = (entry: TimelineEntry) => void;

class RuntimeEngine {
  private activeRuntimes: Map<string, RuntimeAdapter> = new Map();
  private listeners: ExecutionListener[] = [];
  private defaultType: RuntimeAdapter["type"] = "mock";
  private agentTypes: Map<string, RuntimeAdapter["type"]> = new Map();
  private hermesConfig: { apiUrl?: string; apiToken?: string } = {};

  /** 设置默认 Runtime 类型 */
  setDefaultType(type: RuntimeAdapter["type"]) {
    this.defaultType = type;
  }

  /** 设置单个 Agent 的 Runtime 类型 */
  setAgentType(agentId: string, type: RuntimeAdapter["type"]) {
    this.agentTypes.set(agentId, type);
    this.activeRuntimes.delete(agentId); // 清除缓存，下次重新创建
  }

  /** 设置 Hermes 连接配置 */
  setHermesConfig(config: { apiUrl?: string; apiToken?: string }) {
    this.hermesConfig = config;
  }

  /** 订阅执行事件 */
  onExecution(fn: ExecutionListener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private emit(entry: TimelineEntry) {
    this.listeners.forEach(fn => fn(entry));
  }

  /**
   * 执行任务：Context → Adapter → Timeline
   */
  async executeTask(agentId: string, task: ExecutionTask): Promise<ExecutionResult> {
    // 1. 构建上下文
    const context = contextBuilder.build(agentId, task);
    if (!context) {
      return this.errorResult(task.id, agentId, "Agent 上下文构建失败");
    }

    // 2. 获取 Runtime
    const runtime = this.getRuntime(agentId);

    // 3. 执行
    let result: ExecutionResult = {
      taskId: task.id, agentId, success: false, output: "",
      timeline: [], toolCalls: 0, totalDurationMs: 0,
      startedAt: Date.now(), completedAt: 0,
    };

    const gen = runtime.execute(context);
    let genResult: IteratorResult<TimelineEntry, ExecutionResult>;
    
    while (true) {
      genResult = await gen.next();
      if (genResult.done) break;
      this.emit(genResult.value);
      result.timeline.push(genResult.value);
    }

    // 使用 AsyncGenerator 的返回值
    if (genResult && genResult.value) {
      result = genResult.value;
    }
    result.completedAt = Date.now();

    // 🧠 自动更新记忆（任务完成后）
    if (result.success && result.output) {
      const memCount = await memorySummarizer.updateAfterTask(
        agentId, task.title, task.description, result.output, result.success
      );
      if (memCount > 0) {
        this.emit({
          id: `mem-${Date.now()}`,
          timestamp: Date.now(),
          phase: "completed",
          message: `🧠 记忆已更新：+${memCount} 条新经验`,
          detail: `Agent ${agentId} 已记住本次任务经验`,
        });
      }
    }

    return result;
  }

  /**
   * 执行任务（带回调）
   */
  async executeWithCallback(
    agentId: string, task: ExecutionTask,
    onEntry: (entry: TimelineEntry) => void
  ): Promise<ExecutionResult> {
    const unsub = this.onExecution(onEntry);
    try {
      return await this.executeTask(agentId, task);
    } finally {
      unsub();
    }
  }

  /** 停止 Agent 的执行 */
  abort(agentId: string) {
    const runtime = this.activeRuntimes.get(agentId);
    if (runtime) runtime.abort();
  }

  // ===== 私有 =====
  private getRuntime(agentId: string): RuntimeAdapter {
    if (this.activeRuntimes.has(agentId)) {
      return this.activeRuntimes.get(agentId)!;
    }

    const type = this.agentTypes.get(agentId) ?? this.defaultType;
    let runtime: RuntimeAdapter;
    switch (type) {
      case "mock": runtime = new MockRuntime(); break;
      case "hermes": runtime = new HermesRuntime(this.hermesConfig); break;
      case "openclaw": runtime = new OpenClawRuntime(); break;
      case "llm": runtime = new LLMRuntime(); break;
      default: runtime = new MockRuntime();
    }

    this.activeRuntimes.set(agentId, runtime);
    return runtime;
  }

  private errorResult(taskId: string, agentId: string, error: string): ExecutionResult {
    return {
      taskId, agentId, success: false, output: error,
      timeline: [], toolCalls: 0, totalDurationMs: 0,
      startedAt: Date.now(), completedAt: Date.now(),
    };
  }
}

export const runtimeEngine = new RuntimeEngine();
