// ============================================
// AgentHub OS — Runtime Engine V2
// 协同多 Agent 任务场景 + Event Bridge
// ============================================

import {
  AgentRuntimeState,
  RuntimeStatus,
  TaskContext,
  WorkLogEntry,
} from "@/types";

// ============================================
// 场景定义
// ============================================
interface RuntimePhase {
  status: RuntimeStatus;
  durationMs: [number, number];
  thinkingAbout?: string;
  action?: string;
  toolCall?: { name: string; icon: string; input: string; output: string };
  log?: { level: WorkLogEntry["level"]; message: string };
  progressTarget: number;
  blockedBy?: string;
  output?: string;
}

interface RuntimeScenario {
  agentId: string;
  task: TaskContext;
  phases: RuntimePhase[];
  context: string;
}

// ============================================
// 贵州城市产品手册 — 协同场景
// ============================================
const GUIZHOU_SCENARIO: RuntimeScenario[] = [
  // ===== Controller：拆解任务 =====
  {
    agentId: "controller",
    context: "项目协调",
    task: {
      id: "gz-ctrl-001",
      title: "制作贵州城市产品手册",
      description: "接收用户需求：制作一份包含贵阳、遵义、黔东南的贵州城市高端生活方式产品手册",
      assignedBy: "用户",
      priority: "high",
      createdAt: Date.now(),
      input: "用户需求：贵州城市产品手册，定位高端生活方式，目标客群都市中产",
      dependencies: [],
    },
    phases: [
      { status: "THINKING", durationMs: [2000, 3000], thinkingAbout: "分析需求：高端生活方式手册，覆盖3城市",
        action: "阅读需求文档", log: { level: "info", message: "收到任务：制作贵州城市产品手册" }, progressTarget: 10 },
      { status: "PLANNING", durationMs: [1500, 2500], thinkingAbout: "拆解为子任务：调研→内容→设计→审核",
        action: "生成任务分解结构", log: { level: "info", message: "拆解为 4 个子任务" }, progressTarget: 25 },
      { status: "TOOL_CALL", durationMs: [800, 1500],
        toolCall: { name: "orchestrator.assign", icon: "⚙️",
          input: "分配: Research←贵阳/遵义/黔东南调研, Content←文案撰写, Design←视觉设计",
          output: "任务分配完成，4 Agent 已接收" },
        log: { level: "info", message: "任务分配：Research → Content → Design → Reviewer" }, progressTarget: 50 },
      { status: "WAITING", durationMs: [8000, 12000], thinkingAbout: "等待团队执行",
        action: "监控进度", blockedBy: "research-1",
        log: { level: "warn", message: "等待 Research 完成城市调研" }, progressTarget: 70 },
      { status: "TOOL_CALL", durationMs: [800, 1200],
        toolCall: { name: "orchestrator.review", icon: "✅",
          input: "审核各子任务交付物",
          output: "4/4 子任务审核通过，产品手册内容完整" },
        log: { level: "info", message: "审核完成：所有子任务通过" }, progressTarget: 95 },
      { status: "COMPLETED", durationMs: [1000, 2000], thinkingAbout: "项目完成",
        action: "输出汇总",
        output: "贵州城市产品手册 V1 完成，含 3 城市图文+品牌视觉方案",
        log: { level: "info", message: "✅ 贵州城市产品手册项目完成" }, progressTarget: 100 },
    ],
  },
  // ===== Research：资料收集 =====
  {
    agentId: "research-1",
    context: "城市调研",
    task: {
      id: "gz-research-001",
      title: "调研贵阳/遵义/黔东南城市资料",
      description: "收集三座城市的高端生活方式素材：特色地标、美食、文化活动、精品酒店、在地品牌",
      assignedBy: "controller",
      priority: "high",
      createdAt: Date.now() + 2000,
      input: "目标城市：贵阳、遵义、黔东南。素材方向：高端生活方式、在地文化、精品消费",
      dependencies: ["gz-ctrl-001"],
    },
    phases: [
      { status: "THINKING", durationMs: [1500, 2500], thinkingAbout: "确定三城调研框架",
        action: "制定调研计划", log: { level: "info", message: "开始贵州三城调研" }, progressTarget: 10 },
      { status: "TOOL_CALL", durationMs: [2000, 3000],
        toolCall: { name: "web_search", icon: "🌐",
          input: "搜索：贵阳高端生活方式 在地文化 精品消费",
          output: "返回 18 条相关结果" },
        log: { level: "info", message: "贵阳城市素材搜索完成" }, progressTarget: 30 },
      { status: "WORKING", durationMs: [2000, 3000], thinkingAbout: "整理贵阳资料",
        action: "筛选贵阳素材", log: { level: "info", message: "贵阳：青云市集、观山湖、CCPARK 等 12 个素材点" }, progressTarget: 45 },
      { status: "TOOL_CALL", durationMs: [1500, 2500],
        toolCall: { name: "web_search", icon: "🌐",
          input: "搜索：遵义 黔东南 苗寨 高端旅游体验",
          output: "返回 22 条相关结果" },
        log: { level: "info", message: "遵义+黔东南素材搜索完成" }, progressTarget: 65 },
      { status: "WORKING", durationMs: [2000, 3000], thinkingAbout: "整理遵义/黔东南资料",
        action: "整理报告", log: { level: "info", message: "遵义：茅台镇、赤水丹霞。黔东南：西江千户苗寨、镇远古镇" }, progressTarget: 85 },
      { status: "COMPLETED", durationMs: [1000, 2000], thinkingAbout: "输出调研报告",
        action: "交付报告", output: "三城调研报告：推荐素材 36 条，含地标/美食/酒店/文化",
        log: { level: "info", message: "✅ 调研完成：36 条精选素材" }, progressTarget: 100 },
    ],
  },
  // ===== Content：内容撰写 =====
  {
    agentId: "content-1",
    context: "文案创作",
    task: {
      id: "gz-content-001",
      title: "撰写贵州城市产品手册文案",
      description: "基于 Research 提供的素材，撰写高端生活方式品牌文案：城市导语、特色推荐、品牌故事",
      assignedBy: "controller",
      priority: "high",
      createdAt: Date.now() + 4000,
      input: "城市素材：贵阳12条、遵义8条、黔东南16条。定位：高端生活方式。目标：都市中产",
      dependencies: ["gz-research-001"],
    },
    phases: [
      { status: "THINKING", durationMs: [1500, 2000], thinkingAbout: "分析素材，确定文案风格",
        action: "阅读调研报告", log: { level: "info", message: "收到素材，开始策划文案框架" }, progressTarget: 15 },
      { status: "WORKING", durationMs: [2500, 3500], thinkingAbout: "撰写贵阳篇章",
        action: "写贵阳文案", log: { level: "info", message: "贵阳篇章：爽爽贵阳·城市漫游指南" }, progressTarget: 40 },
      { status: "WORKING", durationMs: [2500, 3500], thinkingAbout: "撰写遵义+黔东南篇章",
        action: "写遵义/黔东南文案", log: { level: "info", message: "遵义：红色圣地·酒香之旅。黔东南：苗侗秘境·山居生活" }, progressTarget: 70 },
      { status: "TOOL_CALL", durationMs: [800, 1200],
        toolCall: { name: "text_generation", icon: "✏️",
          input: "生成 3 城市品牌故事各 300 字",
          output: "3 篇品牌故事已生成" },
        log: { level: "info", message: "品牌故事生成完成" }, progressTarget: 85 },
      { status: "WAITING", durationMs: [2000, 4000], thinkingAbout: "等待 Design 视觉方案后调整",
        action: "待视觉联调", blockedBy: "design-1",
        log: { level: "warn", message: "等待 Design 视觉方案" }, progressTarget: 90 },
      { status: "COMPLETED", durationMs: [1000, 1500], thinkingAbout: "文案定稿",
        action: "交付文案", output: "贵州城市产品手册文案 V1：3 城市导语 + 品牌故事 + 推荐清单",
        log: { level: "info", message: "✅ 文案交付：3 城市全篇完成" }, progressTarget: 100 },
    ],
  },
  // ===== Design：视觉设计 =====
  {
    agentId: "design-1",
    context: "视觉设计",
    task: {
      id: "gz-design-001",
      title: "设计贵州城市产品手册视觉方案",
      description: "基于品牌定位和城市素材，设计产品手册视觉方案：封面、排版、色彩系统、图片风格",
      assignedBy: "controller",
      priority: "medium",
      createdAt: Date.now() + 3000,
      input: "品牌定位：高端生活方式。城市：贵阳/遵义/黔东南。风格参考：东方美学+现代极简",
      dependencies: ["gz-ctrl-001"],
    },
    phases: [
      { status: "THINKING", durationMs: [1500, 2500], thinkingAbout: "确定视觉方向：东方美学+现代极简",
        action: "分析品牌定位", log: { level: "info", message: "开始产品手册视觉设计" }, progressTarget: 20 },
      { status: "TOOL_CALL", durationMs: [1500, 2500],
        toolCall: { name: "image_gen", icon: "🖼️",
          input: "生成 3 套封面方案：贵州山水+现代排版风格",
          output: "3 套封面方案已生成" },
        log: { level: "info", message: "封面方案生成完成" }, progressTarget: 45 },
      { status: "WORKING", durationMs: [2500, 3500], thinkingAbout: "设计内页排版+色彩系统",
        action: "设计内页", log: { level: "info", message: "内页排版：贵州绿+苗银灰色彩系统确定" }, progressTarget: 75 },
      { status: "TOOL_CALL", durationMs: [800, 1200],
        toolCall: { name: "image_gen", icon: "🖼️",
          input: "生成各城市配图风格方案",
          output: "3 城市配图风格已确定" },
        log: { level: "info", message: "配图风格方案完成" }, progressTarget: 90 },
      { status: "COMPLETED", durationMs: [1000, 2000], thinkingAbout: "设计交付",
        action: "输出设计规范", output: "产品手册视觉方案：封面×3、内页模板、色彩系统、配图风格指南",
        log: { level: "info", message: "✅ 视觉方案交付" }, progressTarget: 100 },
    ],
  },
  // ===== Reviewer：检查质量 =====
  {
    agentId: "reviewer-1",
    context: "质量审核",
    task: {
      id: "gz-review-001",
      title: "审核贵州城市产品手册质量",
      description: "检查文案准确性、视觉一致性、品牌调性，确保高端生活方式定位",
      assignedBy: "controller",
      priority: "medium",
      createdAt: Date.now() + 8000,
      input: "审核对象：文案V1、视觉方案V1、素材调研报告。审查维度：准确性/一致性/品牌调性",
      dependencies: ["gz-content-001", "gz-design-001"],
    },
    phases: [
      { status: "WAITING", durationMs: [5000, 8000], thinkingAbout: "等待文案和设计完成",
        action: "待命", blockedBy: "content-1",
        log: { level: "warn", message: "等待 Content + Design 完成交付" }, progressTarget: 5 },
      { status: "THINKING", durationMs: [1500, 2000], thinkingAbout: "审查文案准确性",
        action: "审核文案", log: { level: "info", message: "开始审核：文案准确性和品牌调性" }, progressTarget: 30 },
      { status: "WORKING", durationMs: [2000, 3000], thinkingAbout: "审查视觉一致性",
        action: "审核设计", log: { level: "info", message: "视觉方案：色彩系统和排版与品牌定位一致" }, progressTarget: 65 },
      { status: "TOOL_CALL", durationMs: [800, 1200],
        toolCall: { name: "quality_check", icon: "✅",
          input: "全量质量评分：准确性/一致性/品牌调性",
          output: "综合评分 92/100，建议优化遵义章节配图" },
        log: { level: "warn", message: "1 条建议：遵义章节配图可更突出酒文化" }, progressTarget: 85 },
      { status: "COMPLETED", durationMs: [1000, 1500], thinkingAbout: "审核完成",
        action: "提交报告", output: "审核通过 ✅ 综合 92 分，1 条优化建议",
        log: { level: "info", message: "✅ 审核完成：通过率 92%" }, progressTarget: 100 },
    ],
  },
];

// ============================================
// Runtime Engine
// ============================================
type RuntimeListener = (state: Map<string, AgentRuntimeState>) => void;
type EventCallback = (event: { type: string; agentId: string; payload: Record<string, unknown> }) => void;

class RuntimeEngine {
  private states: Map<string, AgentRuntimeState> = new Map();
  private listeners: RuntimeListener[] = [];
  private eventCallbacks: EventCallback[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  constructor() {
    GUIZHOU_SCENARIO.forEach((s) => {
      this.states.set(s.agentId, this.createInitialState(s));
    });
  }

  private createInitialState(s: RuntimeScenario): AgentRuntimeState {
    return {
      runtimeId: `rt-${s.agentId}-${Date.now()}`,
      agentId: s.agentId,
      status: "IDLE",
      currentTask: null,
      thinkingAbout: "",
      recentActions: [],
      blockedBy: null,
      toolHistory: [],
      workLog: [],
      taskProgress: 0,
      context: s.context,
      startedAt: 0,
      endTime: null,
      estimatedRemaining: 0,
    };
  }

  // ===== 公共 API =====
  getState(agentId: string) { return this.states.get(agentId); }
  getAllStates() { return new Map(this.states); }

  subscribe(fn: RuntimeListener) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  /** 桥接到事件引擎 */
  onEvent(fn: EventCallback) {
    this.eventCallbacks.push(fn);
    return () => { this.eventCallbacks = this.eventCallbacks.filter(c => c !== fn); };
  }

  private emit(type: string, agentId: string, payload: Record<string, unknown>) {
    this.eventCallbacks.forEach(c => c({ type, agentId, payload }));
  }

  private notify() {
    const snap = new Map(this.states);
    this.listeners.forEach(l => l(snap));
  }

  start() {
    if (this.running) return;
    this.running = true;
    GUIZHOU_SCENARIO.forEach((s, i) => {
      setTimeout(() => this.runScenario(s), i * 2000);
    });
  }

  stop() {
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // ===== 场景执行 =====
  private runScenario(s: RuntimeScenario) {
    const st = this.states.get(s.agentId)!;
    st.runtimeId = `rt-${s.agentId}-${Date.now()}`;
    st.currentTask = s.task;
    st.startedAt = Date.now();
    st.context = s.context;
    st.endTime = null;
    this.notify();

    // 发射任务创建事件
    this.emit("task.created", s.agentId, {
      taskId: s.task.id,
      title: s.task.title,
      assignedBy: s.task.assignedBy,
    });

    let phaseIdx = 0;

    const runPhase = () => {
      if (!this.running || phaseIdx >= s.phases.length) return;
      const phase = s.phases[phaseIdx];
      const [min, max] = phase.durationMs;
      const delay = min + Math.random() * (max - min);

      // 更新状态
      st.status = phase.status;
      st.thinkingAbout = phase.thinkingAbout || "";
      st.taskProgress = phase.progressTarget;
      st.blockedBy = phase.blockedBy || null;

      if (phase.action) {
        st.recentActions = [phase.action, ...st.recentActions].slice(0, 5);
      }

      // 工具调用
      if (phase.toolCall) {
        const tc = phase.toolCall;
        st.toolHistory = [{
          id: `tool-${Date.now()}`,
          toolName: tc.name,
          icon: tc.icon,
          input: tc.input,
          output: tc.output,
          status: "success" as const,
          timestamp: Date.now(),
          durationMs: max,
        }, ...st.toolHistory].slice(0, 20);
      }

      // 工作日志
      if (phase.log) {
        st.workLog = [{
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          timestamp: Date.now(),
          level: phase.log.level,
          message: phase.log.message,
        }, ...st.workLog].slice(0, 50);
      }

      // 输出
      if (phase.output && st.currentTask) {
        st.currentTask.output = phase.output;
      }

      if (phase.status === "COMPLETED") {
        st.endTime = Date.now();
      }

      st.estimatedRemaining = Math.max(0,
        s.phases.slice(phaseIdx + 1).reduce((sum, p) => sum + p.durationMs[1], 0) / 1000
      );

      this.notify();

      // 桥接事件
      this.emit("agent.status", s.agentId, { status: phase.status, progress: phase.progressTarget });
      if (phase.log) {
        this.emit("event.log", s.agentId, {
          event: RUNTIME_STATUS_LABEL[phase.status],
          detail: phase.log.message,
          level: phase.log.level,
        });
      }
      if (phase.toolCall) {
        this.emit("chat.message", s.agentId, {
          id: `evt-${Date.now()}`,
          agentId: s.agentId,
          content: phase.toolCall.input,
          type: "tool_call",
          timestamp: new Date().toISOString(),
          toolName: phase.toolCall.name,
          toolResult: phase.toolCall.output,
        });
      }

      // 调度下一阶段
      this.timers.push(setTimeout(() => {
        phaseIdx++;
        if (phaseIdx >= s.phases.length) {
          // 15 秒后重启
          this.timers.push(setTimeout(() => {
            this.states.set(s.agentId, this.createInitialState(s));
            this.notify();
            this.timers.push(setTimeout(() => this.runScenario(s), 3000));
          }, 15000));
        } else {
          runPhase();
        }
      }, delay));
    };

    runPhase();
  }
}

// 导入 label 用于事件
import { RUNTIME_STATUS_LABEL } from "@/types";

export const runtimeEngine = new RuntimeEngine();
