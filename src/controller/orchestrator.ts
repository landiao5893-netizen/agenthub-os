// ============================================
// Multi-Agent Orchestrator — 并行调度多个真实 Agent
// Controller 拆解 → HermesRuntime 并行执行 → 汇总
// ============================================

import { hermesIntelligence } from "@/intelligence/hermes-intelligence";
import { Project, ProjectStatus, TaskAnalysis, ControllerLogEntry, ControllerPhase, CONTROLLER_PHASE_LABEL } from "@/controller/types";
import { useChatStore } from "@/stores/chatStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import { getAgentProfile } from "@/lib/agent-profiles";
import { AgentConstitution, getConstitution } from "@/constitution/data";
import { ExecutionTask, TimelineEntry } from "@/runtime-engine/types";
import { AgentProfile } from "@/types";
import { workspaceEngine } from "@/workspace/engine";
import { WorkspaceArtifact } from "@/workspace/types";
import { supervisorEngine } from "@/supervisor/engine";
import { runtimeEngine } from "@/runtime-engine/engine";
import { AGENTHUB_HERMES_SOURCE, getAgentHubHermesSessionSource } from "@/lib/hermes-session";

// ============================================
// 子任务执行结果
// ============================================
interface SubTaskResult {
  taskId: string;
  agentId: string;
  agentName: string;
  success: boolean;
  status?: "completed" | "failed" | "waiting_clarification";
  output: string;
  durationMs: number;
  log: string[];
}

// ============================================
// 编排状态
// ============================================
type OrchestratorListener = (project: Project | null, phase: ControllerPhase, log: ControllerLogEntry[]) => void;

class MultiAgentOrchestrator {
  private project: Project | null = null;
  private phase: ControllerPhase = "receiving";
  private log: ControllerLogEntry[] = [];
  private listeners: OrchestratorListener[] = [];
  private running = false;
  private abortRequested = false;
  private analysisController: AbortController | null = null;
  private apiBase = "/api/intelligence";

  setApiBase(url: string) { this.apiBase = url; }

  stop(): boolean {
    if (!this.running) return false;

    this.abortRequested = true;
    this.analysisController?.abort();

    const project = this.project;
    if (project) {
      const activeAgentIds = new Set(project.subtasks.map((task) => task.subtaskDef.assignedAgent));
      activeAgentIds.forEach((agentId) => runtimeEngine.abort(agentId));

      project.status = "failed";
      project.completedAt = Date.now();
      project.subtasks.forEach((task) => {
        if (task.status === "pending" || task.status === "running") task.status = "failed";
      });
      this.phase = "completed";
      this.addLog("completed", "项目已由用户紧急停止");
      workspaceEngine.addEntry(project.id, "controller-stop", "Controller Agent", "comment", "项目紧急停止", "用户主动终止了当前项目，后续 Agent 不再继续执行。", undefined, "FAILED", "用户紧急停止");

      const workflow = useWorkflowStore.getState().workflow;
      workflow?.nodes.forEach((node) => {
        if (node.status === "active" || node.status === "pending") {
          useWorkflowStore.getState().updateNodeStatus(node.id, "error", node.progress);
        }
      });
      const agentStore = useAgentStore.getState();
      activeAgentIds.forEach((agentId) => agentStore.updateAgentStatus(agentId, "ERROR"));
    }

    useWorkflowStore.getState().setIsRunning(false);
    this.emitChat("【紧急停止】当前项目已停止，未完成任务不会继续传递。");
    this.notify();
    return true;
  }

  subscribe(fn: OrchestratorListener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    if (this.project) {
      this.project.controllerLog = [...this.log];
      useProjectStore.getState().syncProject(this.project);
    }
    this.listeners.forEach(l => l(this.project, this.phase, [...this.log]));
  }

  // ============================================
  // 主流程
  // ============================================
  async execute(userInput: string): Promise<void> {
    const project = this.createPendingProject(userInput);
    useProjectStore.getState().addProject({
      id: project.id,
      name: project.name,
      userRequest: project.userRequest,
      status: project.status,
      progress: 0,
      createdAt: project.createdAt,
      updatedAt: project.createdAt,
      completedAt: null,
    });

    if (this.running) {
      const reason = "未启动：当前已有项目正在执行";
      project.status = "waiting_recovery";
      project.controllerLog = [{
        id: "log-" + Date.now(),
        timestamp: Date.now(),
        phase: "receiving",
        message: reason,
      }];
      useProjectStore.getState().syncProject(project, reason);
      this.emitChat("【等待执行】当前已有任务正在运行，本任务已登记到项目管理。");
      return;
    }

    this.running = true;
    this.abortRequested = false;
    this.analysisController = new AbortController();
    this.project = project;
    this.log = [];
    this.phase = "receiving";
    workspaceEngine.create(project.id, project.name);
    useWorkflowStore.getState().setWorkflow({
      id: project.id,
      name: project.name,
      nodes: [{
        id: "controller-analysis",
        label: "Controller 分析需求",
        status: "active",
        assignedAgent: "controller",
        progress: 10,
      }],
      edges: [],
    });
    useWorkflowStore.getState().setIsRunning(true);

    // 1. 接收需求
    this.addLog("receiving", `收到需求：${userInput.slice(0, 60)}`);
    this.emitChat(`【接收需求】${userInput}`);
    this.notify();

    // 2. 分析任务
    this.phase = "analyzing";
    this.addLog("analyzing", "AI 团队正在分析需求...");
    this.emitChat("【分析任务】正在分析需求...");
    this.notify();

    let analysis: TaskAnalysis;
    try {
      analysis = await hermesIntelligence.plan(userInput, this.analysisController.signal);
    } catch (err: unknown) {
      if (this.abortRequested) {
        this.analysisController = null;
        this.running = false;
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      project.status = "failed";
      project.completedAt = Date.now();
      project.progress = 0;
      this.phase = "completed";
      this.addLog("completed", "❌ Controller 分析失败：" + message);
      workspaceEngine.addEntry(project.id, "controller", "Controller Agent", "comment", "分析失败", "执行失败：" + message, undefined, "FAILED", message);
      useWorkflowStore.getState().updateNodeStatus("controller-analysis", "error", 100);
      useWorkflowStore.getState().setIsRunning(false);
      this.emitChat("【项目失败】Controller 分析失败：" + message);
      this.notify();
      this.running = false;
      return;
    }
    this.analysisController = null;
    if (this.abortRequested) {
      this.running = false;
      return;
    }
    this.addLog("analyzing", `识别领域：${analysis.domain} | ${analysis.subtasks.length} 个子任务 | 复杂度：${analysis.complexity}`);
    this.emitChat(`【分析结果】领域：${analysis.domain}，拆解为 ${analysis.subtasks.length} 个独立子任务`);
    this.notify();

    // 3. 创建项目
    this.phase = "planning";
    Object.assign(project, {
      name: analysis.intent,
      description: userInput,
      userRequest: userInput,
      analysis,
      status: "executing",
      progress: 0,
      subtasks: analysis.subtasks.map(st => ({
        subtaskDef: st,
        status: "pending" as const,
        progress: 0,
      })),
      createdAt: project.createdAt,
      startedAt: Date.now(),
      completedAt: null,
      controllerLog: [],
    });
    this.project = project;
    runtimeEngine.setDefaultType("hermes");
    runtimeEngine.setHermesConfig({ apiUrl: this.apiBase });
    workspaceEngine.create(project.id, project.name);
    workspaceEngine.setProjectFlows(project.id, analysis.dag.map((edge) => {
      const fromTask = analysis.subtasks.find((task) => task.id === edge.from);
      const toTask = analysis.subtasks.find((task) => task.id === edge.to);
      return {
        from: fromTask?.assignedAgent ?? edge.from,
        to: toTask?.assignedAgent ?? edge.to,
        autoForward: true,
        description: "Controller DAG",
      };
    }).filter((flow, index, flows) => flow.from !== flow.to && flows.findIndex((item) => item.from === flow.from && item.to === flow.to) === index));
    workspaceEngine.addEntry(project.id, "controller", "Controller Agent", "task", "任务拆解", analysis.subtasks.map(st => st.title + " → " + st.assignedAgent).join("\n"));
    useWorkflowStore.getState().setWorkflow({
      id: project.id,
      name: project.name,
      nodes: project.subtasks.map((task) => ({
        id: task.subtaskDef.id,
        label: task.subtaskDef.title,
        status: "pending",
        assignedAgent: task.subtaskDef.assignedAgent,
        progress: 0,
      })),
      edges: analysis.dag,
    });
    useWorkflowStore.getState().setIsRunning(true);
    supervisorEngine.startSupervision(
      project.id,
      project.name,
      [...new Set(project.subtasks.map((task) => task.subtaskDef.assignedAgent))]
    );

    for (const st of analysis.subtasks) {
      this.addLog("planning", `  └ ${st.title} → ${st.assignedAgent}`);
      this.emitChat(`【任务分配】${st.title} → ${st.assignedAgent}`);
    }
    this.notify();

    // 4. 加载 Agent 上下文 + 并行执行
    this.phase = "dispatching";
    this.addLog("dispatching", `启动 ${analysis.subtasks.length} 个 Agent 按依赖顺序执行...`);
    this.emitChat(`【开始执行】${analysis.subtasks.length} 个 Agent 按依赖顺序工作中...`);
    this.notify();

    const results = await this.executeSubtasks(project);
    if (this.abortRequested) {
      this.running = false;
      return;
    }

    // 5. 汇总
    this.phase = "synthesizing";
    const successCount = results.filter(r => r.success).length;
    const waitingCount = results.filter(r => r.status === "waiting_clarification").length;
    project.status = (waitingCount > 0 ? String.fromCharCode(119,97,105,116,105,110,103,95,114,101,99,111,118,101,114,121) : (successCount === results.length ? String.fromCharCode(115,117,99,99,101,115,115) : (successCount > 0 ? String.fromCharCode(112,97,114,116,105,97,108,95,115,117,99,99,101,115,115) : String.fromCharCode(102,97,105,108,101,100)))) as ProjectStatus;
    project.completedAt = waitingCount > 0 ? null : Date.now();
    project.progress = waitingCount > 0 ? Math.round((successCount / project.subtasks.length) * 100) : 100;

    this.addLog(String.fromCharCode(115,121,110,116,104,101,115,105,122,105,110,103) as ControllerPhase, String.fromCharCode(83,117,109,109,97,114,121,58,32) + successCount + String.fromCharCode(47) + results.length + String.fromCharCode(32,111,107,44,32,115,116,97,116,117,115,58,32) + project.status);
    for (const r of results) {
      project.subtasks.find(t => t.subtaskDef.id === r.taskId)!.status = r.status === "waiting_clarification" ? "running" : (r.success ? "completed" : "failed");
      project.subtasks.find(t => t.subtaskDef.id === r.taskId)!.output = r.output;
      this.addLog("synthesizing", `  ${r.agentName}：${r.output.slice(0, 60)}`);
    }
    if (waitingCount > 0) {
      this.addLog("monitoring", "等待澄清：任务已暂停，等待用户补充信息。");
      this.emitChat("【等待澄清】任务已暂停，等待补充信息。");
      this.phase = "monitoring";
      this.project = project;
      this.project.controllerLog = [...this.log];
      useWorkflowStore.getState().setIsRunning(false);
      this.notify();
      this.running = false;
      return;
    }
    const finalOutput = hermesIntelligence.synthesize(results);
    workspaceEngine.addEntry(project.id, "controller-final", "Controller Agent", "comment", "最终交付", finalOutput, undefined, successCount > 0 ? "SUCCESS" : "FAILED", successCount > 0 ? undefined : "全部 Agent 执行失败");
    this.emitChat("【最终交付】" + String.fromCharCode(10) + finalOutput.slice(0, 1800));
    this.addLog("completed", `项目「${project.name}」完成`);
    this.emitChat(String.fromCharCode(83,116,97,116,117,115,58,32) + project.status + String.fromCharCode(32) + successCount + String.fromCharCode(47) + results.length + String.fromCharCode(32,111,107));
    this.phase = "completed";
    this.project = project;
    this.project.controllerLog = [...this.log];
    useWorkflowStore.getState().setIsRunning(false);
    this.notify();
    this.running = false;
  }

  // ============================================
  // 并行执行子任务
  // ============================================
  private async executeSubtasks(project: Project): Promise<SubTaskResult[]> {
    const results: SubTaskResult[] = [];
    const completed = new Set<string>();
    const failed = new Set<string>();

    while (completed.size + failed.size < project.subtasks.length) {
      if (this.abortRequested) break;
      const ready = project.subtasks.filter((task) => {
        const st = task.subtaskDef;
        if (task.status !== "pending") return false;
        return st.dependsOn.every((dep) => completed.has(dep));
      });

      if (ready.length === 0) {
        const blocked = project.subtasks.filter((task) => task.status === "pending");
        const blockedResults = blocked.map((task) => {
          task.status = "failed";
          failed.add(task.subtaskDef.id);
          return this.failResult(task.subtaskDef.id, task.subtaskDef.assignedAgent, task.subtaskDef.assignedAgent, "依赖任务未完成，无法继续执行");
        });
        results.push(...blockedResults);
        break;
      }

      for (const task of ready) {
        if (this.abortRequested) break;
        const result = await this.executeSingleSubtask(project, task);
        results.push(result);
        if (result.success) completed.add(result.taskId);
        else if (result.status === "waiting_clarification") return results;
        else failed.add(result.taskId);
      }
    }

    return results;
  }

  private async executeSingleSubtask(project: Project, task: Project["subtasks"][number]): Promise<SubTaskResult> {
    const st = task.subtaskDef;
    const profile = getAgentProfile(st.assignedAgent);
    const constitution = getConstitution(st.assignedAgent);
    if (!profile || !constitution) {
      task.status = "failed";
      return this.failResult(st.id, st.assignedAgent, profile?.name ?? st.assignedAgent, "Agent 数据缺失");
    }

    const agentStore = useAgentStore.getState();
    agentStore.updateAgentStatus(st.assignedAgent, "THINKING");
    agentStore.updateAgentProgress(st.assignedAgent, 5);
    task.status = "running";

    this.addLog("dispatching", "🚀 " + profile.name + " 开始执行：" + st.title);
    this.emitChat("【" + profile.name + "】" + st.title + " — 执行中...");
    this.notify();

    const combinedInput = hermesIntelligence.prepareAgentInput(project, st);

    const execTask: ExecutionTask = {
      id: st.id,
      title: st.title,
      description: st.description,
      input: combinedInput,
      priority: st.priority,
      assignedBy: "Controller",
    };

    const startedAt = Date.now();
    try {
      agentStore.updateAgentStatus(st.assignedAgent, "WORKING");
      agentStore.updateAgentProgress(st.assignedAgent, 40);
      useWorkflowStore.getState().updateNodeStatus(st.id, "active", 40);

      const runtimeResult = await runtimeEngine.executeWithCallback(st.assignedAgent, execTask, (entry: TimelineEntry) => this.handleRuntimeEntry(st.assignedAgent, profile.name, entry));
      if (this.abortRequested) {
        return this.failResult(st.id, st.assignedAgent, profile.name, "项目已紧急停止");
      }
      const output = runtimeResult.output || "Runtime 未返回输出";
      if (runtimeResult.status === "waiting_clarification") {
        agentStore.updateAgentStatus(st.assignedAgent, "WAITING");
        agentStore.updateAgentProgress(st.assignedAgent, 60);
        useWorkflowStore.getState().updateNodeStatus(st.id, "active", 60);
        task.status = "running";
        task.output = output;
        this.addLog("monitoring", profile.name + " 等待澄清：" + output);
        this.emitChat("【" + profile.name + "】等待澄清：" + output);
        this.notify();
        return { taskId: st.id, agentId: st.assignedAgent, agentName: profile.name, success: false, status: "waiting_clarification", output, durationMs: Date.now() - startedAt, log: ["waiting_clarification"] };
      }
      const duration = Date.now() - startedAt;
      const quality = await supervisorEngine.checkQuality(st.assignedAgent, st.title, st.description, output);
      const passed = runtimeResult.success && quality.score.passed;

      agentStore.updateAgentStatus(st.assignedAgent, passed ? "DONE" : "ERROR");
      agentStore.updateAgentProgress(st.assignedAgent, passed ? 100 : 85);
      useWorkflowStore.getState().updateNodeStatus(st.id, passed ? "completed" : "error", passed ? 100 : 85);
      const workspaceEntry = workspaceEngine.addEntry(project.id, st.assignedAgent, profile.name, "output", st.title, output, st.dependsOn?.[0], passed ? "SUCCESS" : "FAILED", passed ? undefined : quality.score.feedback);

      if (passed && this.shouldGenerateVideo(project, st.title, st.description, st.assignedAgent)) {
        this.addLog("monitoring", "Video 正在生成可下载视频...");
        this.emitChat("【Video】正在生成视频，完成后会保存到交付中心。");
        this.notify();
        try {
          const artifact = await this.generateVideoArtifact(project, workspaceEntry.id, st.title, output);
          workspaceEngine.addArtifacts(project.id, workspaceEntry.id, [artifact]);
          this.addLog("monitoring", "✅ 视频已保存到 Workspace：" + artifact.name);
          this.emitChat("【Video】✅ 视频已生成，可在右侧交付中心播放和下载。");
        } catch (videoError) {
          const videoMessage = videoError instanceof Error ? videoError.message : String(videoError);
          this.addLog("monitoring", "⚠️ 视频方案已完成，视频生成失败：" + videoMessage);
          this.emitChat("【Video】方案已完成；视频生成失败：" + videoMessage);
        }
      } else if (passed && this.shouldGenerateImage(project, st.title, st.description, st.assignedAgent)) {
        this.addLog("monitoring", "Design 正在生成可下载视觉稿...");
        this.emitChat("【Design】正在生成视觉稿，完成后会保存到交付中心。");
        this.notify();
        try {
          const artifact = await this.generateDesignArtifact(project, workspaceEntry.id, st.title, output);
          workspaceEngine.addArtifacts(project.id, workspaceEntry.id, [artifact]);
          this.addLog("monitoring", "✅ 视觉稿已保存到 Workspace：" + artifact.name);
          this.emitChat("【Design】✅ 视觉稿已生成，可在右侧交付中心预览和下载。");
        } catch (imageError) {
          const imageMessage = imageError instanceof Error ? imageError.message : String(imageError);
          this.addLog("monitoring", "⚠️ 文字设计方案已完成，图片生成失败：" + imageMessage);
          this.emitChat("【Design】文字方案已完成；图片生成失败：" + imageMessage);
        }
      }

      task.status = passed ? "completed" : "failed";
      task.output = output;
      this.addLog("monitoring", (passed ? "✅ " : "❌ ") + profile.name + " 完成（" + (duration/1000).toFixed(1) + "s）：" + quality.score.feedback);
      this.emitChat("【" + profile.name + "】" + (passed ? "✅ " : "❌ ") + quality.score.feedback + "：" + output.slice(0, 120));
      this.notify();

      return { taskId: st.id, agentId: st.assignedAgent, agentName: profile.name, success: passed, status: passed ? "completed" : "failed", output, durationMs: duration, log: [quality.score.feedback] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      agentStore.updateAgentStatus(st.assignedAgent, "ERROR");
      agentStore.updateAgentProgress(st.assignedAgent, 85);
      useWorkflowStore.getState().updateNodeStatus(st.id, "error", 85);
      task.status = "failed";
      task.output = message;
      workspaceEngine.addEntry(project.id, st.assignedAgent, profile.name, "output", st.title, "执行失败：" + message, st.dependsOn?.[0], "FAILED", message);
      await supervisorEngine.checkQuality(st.assignedAgent, st.title, st.description, "执行失败：" + message);
      this.addLog("monitoring", "❌ " + profile.name + " 失败：" + message);
      this.emitChat("【" + profile.name + "】❌ 失败：" + message);
      this.notify();
      return this.failResult(st.id, st.assignedAgent, profile.name, message);
    }
  }

  private shouldGenerateVideo(project: Project, title: string, description: string, agentId: string) {
    if (!/video|design/i.test(agentId)) return false;
    const request = project.userRequest + " " + title + " " + description;
    return /视频|短片|宣传片|动画|片头|片尾|video/i.test(request);
  }

  private async generateVideoArtifact(project: Project, entryId: string, title: string, output: string): Promise<WorkspaceArtifact> {
    const prompt = [
      "为项目《" + project.name + "》生成一段专业、可交付的短视频。",
      "当前视频任务：" + title,
      "分镜与视觉方案摘要：" + output.slice(0, 2400),
      "要求：主体一致、运动自然、镜头连贯、画面干净，不要生成水印或界面截图。",
    ].join("\n");

    const response = await fetch("/api/hermes/video-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        projectId: project.id,
        entryId,
        name: "video-preview",
        aspectRatio: /竖屏|9:16/.test(project.userRequest) ? "9:16" : "16:9",
        duration: 5,
      }),
    });
    const payload = await response.json() as { ok?: boolean; artifact?: WorkspaceArtifact; error?: string };
    if (!response.ok || !payload.ok || !payload.artifact) {
      throw new Error(payload.error ?? "视频生成接口未返回文件");
    }
    return payload.artifact;
  }
  private shouldGenerateImage(project: Project, title: string, description: string, agentId: string) {
    if (!/design/i.test(agentId)) return false;
    if (!/设计|视觉|图片|图像|海报|封面|手册/.test(project.userRequest)) return false;
    return /视觉方向|主视觉|封面|图片|图像|视觉稿/.test(title + " " + description);
  }

  private async generateDesignArtifact(project: Project, entryId: string, title: string, output: string): Promise<WorkspaceArtifact> {
    const prompt = [
      "为项目《" + project.name + "》生成一张专业、可交付的方形视觉概念图。",
      "当前设计任务：" + title,
      "设计方案摘要：" + output.slice(0, 2600),
      "要求：画面完整、主体清晰、适合产品手册视觉提案；不要生成文字、Logo、水印或界面截图。",
    ].join("\n");

    const response = await fetch("/api/hermes/image-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        projectId: project.id,
        entryId,
        name: "design-preview",
      }),
    });
    const payload = await response.json() as { ok?: boolean; artifact?: WorkspaceArtifact; error?: string };
    if (!response.ok || !payload.ok || !payload.artifact) {
      throw new Error(payload.error ?? "图片生成接口未返回文件");
    }
    return payload.artifact;
  }
  private createPendingProject(userInput: string): Project {
    const createdAt = Date.now();
    return {
      id: `proj-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
      name: userInput.slice(0, 48) || "未命名任务",
      description: userInput,
      userRequest: userInput,
      analysis: {
        intent: userInput.slice(0, 80) || "待分析任务",
        domain: "待分析",
        complexity: "simple",
        suggestedAgents: ["controller"],
        subtasks: [],
        dag: [],
        estimatedMinutes: 0,
      },
      status: "planning",
      progress: 0,
      subtasks: [],
      createdAt,
      startedAt: createdAt,
      completedAt: null,
      controllerLog: [],
    };
  }

  private handleRuntimeEntry(agentId: string, agentName: string, entry: TimelineEntry) {
    const progressByPhase: Record<TimelineEntry["phase"], number> = { received: 10, context_load: 20, rule_check: 30, thinking: 45, tool_call: 60, executing: 75, output: 90, completed: 100, waiting_clarification: 60, error: 85 };
    const store = useAgentStore.getState();
    store.updateAgentProgress(agentId, progressByPhase[entry.phase]);
    if (entry.phase === "waiting_clarification") store.updateAgentStatus(agentId, "WAITING");
    this.addLog("monitoring", agentName + " / Runtime：" + entry.message);
    this.emitChat("【" + agentName + " Runtime】" + entry.message);
  }

  // ============================================
  // 智能引擎 调用
  // ============================================
  private async callHermes(profile: AgentProfile, constitution: AgentConstitution, subtask: ExecutionTask, memoryContext: string): Promise<string> {
    const prompt = `# 角色身份
你是 ${profile.name}，${profile.title}，隶属于 ${profile.department}。

# 工作原则
${constitution.workingPrinciples.map((p: string) => `- ${p}`).join("\n")}

# 禁止事项
${constitution.prohibitions.map((p: string) => `- 🚫 ${p}`).join("\n")}

# 相关记忆
${memoryContext}

# 当前任务
标题：${subtask.title}
描述：${subtask.description}
输入：${subtask.input}

请高效完成以上任务。`;

    const body = {
      input: prompt,
      provider: "opencode-go",
      model: "deepseek-v4-flash",
      source: AGENTHUB_HERMES_SOURCE,
      session_source: getAgentHubHermesSessionSource("controller_recovery"),
      run_mode: "runtime",
      timeout_ms: 60000,
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const res = await fetch(`${this.apiBase}/runs`, {
      method: "POST", headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown");
      throw new Error(`智能引擎 ${res.status}: ${err.slice(0, 150)}`);
    }

    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "智能引擎 返回异常");
    return data.output ?? JSON.stringify(data);
  }

  // ===== 辅助 =====
  private addLog(phase: ControllerPhase, message: string) {
    this.log.push({
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2,6),
      timestamp: Date.now(), phase, message,
    });
    useWorkflowStore.getState().addEventLog({
      id: "event-" + Date.now() + "-" + Math.random().toString(36).slice(2,6),
      timestamp: new Date(),
      agentId: "controller",
      event: CONTROLLER_PHASE_LABEL[phase] ?? phase,
      detail: message,
      level: message.includes("❌") ? "error" : (message.includes("✅") || phase === "completed" ? "success" : (message.includes("等待") ? "warn" : "info")),
    });
  }

  private emitChat(content: string) {
    useChatStore.getState().addMessage({
      id: `orch-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      agentId: "controller", content, type: "log", channel: "execution",
      timestamp: new Date(),
    });
  }

  private failResult(taskId: string, agentId: string, agentName: string, error: string): SubTaskResult {
    return { taskId, agentId, agentName, success: false, status: "failed", output: error, durationMs: 0, log: [] };
  }
}

export const orchestrator = new MultiAgentOrchestrator();
