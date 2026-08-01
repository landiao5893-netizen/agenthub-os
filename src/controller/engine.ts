// ============================================
// Controller Engine — 总控智能体核心
// 接收需求 → 分析 → 拆解 → 分配 → 监督 → 汇总
// ============================================

import { mockLLM } from "./mock-llm";
import {
  Project, ControllerState, ControllerPhase,
  ControllerLogEntry, CONTROLLER_PHASE_LABEL,
} from "./types";
import { adapterRegistry } from "@/adapters/registry";
import { AdapterTaskInput } from "@/adapters/base";
import { useChatStore } from "@/stores/chatStore";
import { constitutionEngine } from "@/constitution/engine";

// ============================================
// Controller Engine
// ============================================
type ControllerListener = (state: ControllerState) => void;

class ControllerEngine {
  private state: ControllerState = {
    currentProject: null,
    phase: "receiving",
    isActive: false,
    log: [],
  };
  private listeners: ControllerListener[] = [];
  private monitorInterval: ReturnType<typeof setInterval> | null = null;

  // ===== 订阅 =====
  subscribe(fn: ControllerListener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state, log: [...this.state.log] }));
  }

  getState(): ControllerState {
    return { ...this.state, log: [...this.state.log] };
  }

  // ============================================
  // 主流程：接收用户输入 → 完成项目
  // ============================================
  async handleUserRequest(input: string): Promise<void> {
    if (this.state.isActive) return; // 同一时间只处理一个项目
    this.state.isActive = true;
    this.state.log = [];

    // Phase 1: 接收需求
    this.log("receiving", `收到用户需求：${input.slice(0, 50)}`);

    // Phase 2: 分析任务
    this.log("analyzing", "正在分析需求...");
    const analysis = await mockLLM.analyze(input);
    this.log("analyzing", `领域：${analysis.domain} | 复杂度：${analysis.complexity} | ${analysis.subtasks.length}个子任务`);

    // Phase 3: 规划分解
    this.log("planning", `生成 ${analysis.subtasks.length} 个子任务`);
    for (const st of analysis.subtasks) {
      this.log("planning", `  └ ${st.title} → ${st.assignedAgent}`);
    }

    // Phase 4: 选择 Agent
    this.log("selecting", `推荐 ${analysis.suggestedAgents.length} 个 Agent`);
    analysis.suggestedAgents.forEach(aid => {
      this.log("selecting", `  ✓ ${aid}`);
    });

    // Phase 5: 构建 DAG
    this.log("building_dag", `构建任务依赖图：${analysis.dag.length} 条边`);
    analysis.dag.forEach(edge => {
      this.log("building_dag", `  ${edge.from} → ${edge.to}`);
    });

    // 创建项目
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: analysis.intent,
      description: input,
      userRequest: input,
      analysis,
      status: "planning",
      progress: 0,
      subtasks: analysis.subtasks.map(st => ({
        subtaskDef: st,
        status: "pending" as const,
        progress: 0,
      })),
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      controllerLog: [...this.state.log],
    };
    this.state.currentProject = project;
    this.notify();

    // Phase 6: 分发任务（按 DAG 顺序）
    this.log("dispatching", "开始分发任务...");
    project.status = "executing";
    project.startedAt = Date.now();
    this.notify();

    // 按拓扑顺序分发
    await this.dispatchTasks(project);

    // Phase 7: 监督执行
    this.log("monitoring", "监督任务执行...");
    this.notify();

    // 启动监控循环
    this.startMonitoring(project);

    // 发送 Controller 日志到聊天区
    this.state.log.forEach(entry => {
      useChatStore.getState().addMessage({
        id: `ctrl-${entry.id}`,
        agentId: "controller",
        content: `【${CONTROLLER_PHASE_LABEL[entry.phase]}】${entry.message}`,
        type: entry.phase === "completed" ? "text" : "log",
        timestamp: new Date(entry.timestamp),
      });
    });
  }

  // ===== 拓扑排序分发 =====
  private async dispatchTasks(project: Project) {
    const completed = new Set<string>();
    const remaining = [...project.subtasks];

    while (remaining.length > 0) {
      // 找到所有依赖已满足的任务
      const ready = remaining.filter(t =>
        t.subtaskDef.dependsOn.every(dep => completed.has(dep))
      );

      if (ready.length === 0) break; // 死锁

      // 并行分发
      for (const task of ready) {
        const idx = remaining.indexOf(task);
        remaining.splice(idx, 1);

        task.status = "assigned";

        // ===== 宪法合规检查 =====
        const check = constitutionEngine.checkTask(
          task.subtaskDef.assignedAgent,
          task.subtaskDef.title,
          task.subtaskDef.description
        );
        if (!check.passed) {
          this.log("dispatching", `⚠️ 宪法违规：${task.subtaskDef.assignedAgent} — ${check.violations.join("；")}`);
          // 仍然分发，但记录警告
        }
        if (check.suggestions.length > 0) {
          this.log("dispatching", `💡 ${task.subtaskDef.assignedAgent} 宪法建议：${check.suggestions[0]}`);
        }

        // 通过 Adapter 发送任务
        const adapter = await adapterRegistry.getAdapter(task.subtaskDef.assignedAgent);
        if (adapter) {
          const adapterInput: AdapterTaskInput = {
            taskId: task.subtaskDef.id,
            title: task.subtaskDef.title,
            description: task.subtaskDef.description,
            input: task.subtaskDef.input,
            priority: task.subtaskDef.priority,
          };
          await adapter.sendTask(adapterInput);
          task.status = "running";
          task.startedAt = Date.now();
          this.log("dispatching", `✓ 已分发：${task.subtaskDef.title} → ${task.subtaskDef.assignedAgent}`);
        } else {
          this.log("dispatching", `✗ 无法分发（Adapter 不可用）：${task.subtaskDef.assignedAgent}`);
        }

        completed.add(task.subtaskDef.id);
        this.notify();
      }
    }
  }

  // ===== 监控循环 =====
  private startMonitoring(project: Project) {
    this.monitorInterval = setInterval(async () => {
      if (!this.state.isActive || !this.state.currentProject) {
        this.stopMonitoring();
        return;
      }

      // 检查每个子任务状态
      let allDone = true;
      for (const task of project.subtasks) {
        if (task.status === "completed" || task.status === "failed") continue;
        allDone = false;

        try {
          const adapter = await adapterRegistry.getAdapter(task.subtaskDef.assignedAgent);
          if (adapter) {
            const status = await adapter.getStatus();
            task.agentRuntimeStatus = status.status;
            task.progress = status.progress;
            if (status.status === "COMPLETED") {
              task.status = "completed";
              task.completedAt = Date.now();
              const result = await adapter.getResult(task.subtaskDef.id);
              task.output = result.output;
              this.log("monitoring", `✓ 完成：${task.subtaskDef.title}`);
            }
          }
        } catch { /* ignore */ }
      }

      // 更新总体进度
      const completedCount = project.subtasks.filter(t => t.status === "completed").length;
      project.progress = Math.round((completedCount / project.subtasks.length) * 100);
      this.notify();

      // 全部完成
      if (allDone || completedCount === project.subtasks.length) {
        this.stopMonitoring();
        project.status = "completed";
        project.completedAt = Date.now();
        this.state.phase = "completed";

        // Phase 8: 收集结果
        this.log("collecting", "收集所有子任务结果...");
        for (const task of project.subtasks) {
          this.log("collecting", `  ${task.subtaskDef.title}: ${task.output ?? "完成"}`);
        }

        // Phase 9: 汇总
        this.log("synthesizing", `项目完成！共 ${project.subtasks.length} 个子任务全部完成`);
        this.log("completed", `✅ 「${project.name}」项目完成`);

        // 输出到聊天
        useChatStore.getState().addMessage({
          id: `ctrl-done-${Date.now()}`,
          agentId: "controller",
          content: `✅ 项目「${project.name}」已完成！\n${project.subtasks.length}个子任务全部通过，总进度 ${project.progress}%`,
          type: "text",
          timestamp: new Date(),
        });

        project.controllerLog = [...this.state.log];
        this.state.isActive = false;
        this.notify();
      }
    }, 2000);
  }

  private stopMonitoring() {
    if (this.monitorInterval) { clearInterval(this.monitorInterval); this.monitorInterval = null; }
  }

  // ===== 日志 =====
  private log(phase: ControllerPhase, message: string) {
    const entry: ControllerLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      timestamp: Date.now(),
      phase,
      message,
    };
    this.state.log.push(entry);
    this.state.phase = phase;
    this.notify();
  }
}

// ============================================
// 导出单例
// ============================================
export const controllerEngine = new ControllerEngine();
