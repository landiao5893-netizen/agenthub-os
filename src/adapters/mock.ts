// ============================================
// MockAdapter — 封装现有模拟逻辑到 Adapter 接口
// 保持当前 UI 完全不变
// ============================================

import {
  BaseAdapter,
  AdapterConfig,
  AdapterTaskInput,
  AdapterState,
} from "./base";
import { RuntimeStatus } from "@/types";

// 模拟的任务场景数据（精简版，实际数据在 Runtime Engine 中）
interface MockPhase {
  status: RuntimeStatus;
  durationMs: [number, number];
  thinkingAbout: string;
  progressTarget: number;
  log?: { level: "info" | "warn" | "error"; message: string };
  toolCall?: { name: string; icon: string; input: string; output: string };
}

export class MockAdapter extends BaseAdapter {
  private connected = false;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private status: RuntimeStatus = "IDLE";
  private progress = 0;
  private currentTaskId: string | null = null;
  private phases: MockPhase[] = [];
  private phaseIdx = 0;

  // 预定义模拟阶段
  private static PHASES: MockPhase[] = [
    { status: "THINKING", durationMs: [2000, 3000], thinkingAbout: "分析任务需求", progressTarget: 15,
      log: { level: "info", message: "开始分析任务" } },
    { status: "PLANNING", durationMs: [1500, 2500], thinkingAbout: "制定执行计划", progressTarget: 30,
      log: { level: "info", message: "执行计划已生成" } },
    { status: "WORKING", durationMs: [2500, 4000], thinkingAbout: "执行核心逻辑", progressTarget: 60,
      log: { level: "info", message: "核心逻辑执行中" } },
    { status: "TOOL_CALL", durationMs: [1500, 2500], thinkingAbout: "调用工具",
      toolCall: { name: "task.execute", icon: "⚡", input: "执行任务", output: "执行成功" },
      log: { level: "info", message: "工具调用完成" }, progressTarget: 80 },
    { status: "WAITING", durationMs: [2000, 3000], thinkingAbout: "等待依赖完成",
      log: { level: "warn", message: "等待依赖任务完成" }, progressTarget: 90 },
    { status: "COMPLETED", durationMs: [1000, 1500], thinkingAbout: "任务完成",
      log: { level: "info", message: "✅ 任务完成" }, progressTarget: 100 },
  ];

  constructor(config: AdapterConfig) {
    super(config);
    this.phases = [...MockAdapter.PHASES];
  }

  // ===== 生命周期 =====
  async initialize(): Promise<void> {
    this.connected = true;
    this.emit({
      type: "connected", agentId: this.config.agentId, timestamp: Date.now(),
      payload: { message: `${this.config.provider} adapter connected` },
    });
  }

  async shutdown(): Promise<void> {
    this.connected = false;
    this.stopLoop();
    this.emit({
      type: "disconnected", agentId: this.config.agentId, timestamp: Date.now(),
      payload: { message: `${this.config.provider} adapter disconnected` },
    });
  }

  // ===== 任务控制 =====
  async sendTask(task: AdapterTaskInput): Promise<void> {
    this.currentTaskId = task.taskId;
    this.progress = 0;
    this.status = "IDLE";
    this.phaseIdx = 0;
    this.startLoop();
  }

  async getStatus(): Promise<AdapterState> {
    return {
      agentId: this.config.agentId,
      connected: this.connected,
      status: this.status,
      currentTaskId: this.currentTaskId,
      progress: this.progress,
      lastEvent: Date.now(),
    };
  }

  async getResult(taskId: string): Promise<{ output?: string; error?: string }> {
    if (this.status === "COMPLETED") {
      return { output: `Mock task ${taskId} completed successfully` };
    }
    if (this.status === "ERROR") {
      return { error: `Mock task ${taskId} failed` };
    }
    return {};
  }

  async stopTask(): Promise<void> {
    this.stopLoop();
    this.status = "IDLE";
    this.currentTaskId = null;
  }

  // ===== 模拟循环 =====
  private startLoop(): void {
    this.runPhase();
  }

  private runPhase(): void {
    if (!this.connected || this.phaseIdx >= this.phases.length) return;
    const phase = this.phases[this.phaseIdx];
    const [min, max] = phase.durationMs;
    const delay = min + Math.random() * (max - min);

    // 更新状态
    this.status = phase.status;
    this.progress = phase.progressTarget;

    // 发射事件
    this.emit({
      type: "status_change", agentId: this.config.agentId, timestamp: Date.now(),
      payload: { status: phase.status, thinkingAbout: phase.thinkingAbout, progress: phase.progressTarget },
    });

    if (phase.log) {
      this.emit({
        type: "log_entry", agentId: this.config.agentId, timestamp: Date.now(),
        payload: { logEntry: { id: `log-${Date.now()}`, timestamp: Date.now(), level: phase.log.level, message: phase.log.message } },
      });
    }

    if (phase.toolCall) {
      this.emit({
        type: "tool_call", agentId: this.config.agentId, timestamp: Date.now(),
        payload: { toolCall: { id: `tool-${Date.now()}`, toolName: phase.toolCall.name, icon: phase.toolCall.icon, input: phase.toolCall.input, output: phase.toolCall.output, status: "success", timestamp: Date.now(), durationMs: delay } },
      });
    }

    if (phase.status === "COMPLETED") {
      this.emit({
        type: "task_completed", agentId: this.config.agentId, timestamp: Date.now(),
        payload: { output: "Task completed", message: phase.thinkingAbout },
      });
    }

    // 下一阶段
    this.loopTimer = setTimeout(() => {
      this.phaseIdx++;
      if (this.phaseIdx >= this.phases.length) {
        // 循环
        this.phaseIdx = 0;
        this.progress = 0;
        this.loopTimer = setTimeout(() => this.runPhase(), 5000);
      } else {
        this.runPhase();
      }
    }, delay);
  }

  private stopLoop(): void {
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
  }
}
