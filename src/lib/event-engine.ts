// ============================================
// AgentHub OS — Mock Event Stream Engine
// 模拟真实 AI Agent 团队实时工作流
// 接口设计兼容未来 WebSocket 接入
// ============================================

import { AgentInternalStatus } from "@/types";

// ============================================
// WebSocket 消息格式（未来真实 WS 也用这个）
// ============================================
export type WsMessageType =
  | "agent.status"
  | "agent.progress"
  | "agent.task"
  | "workflow.node"
  | "event.log"
  | "chat.message"
  | "connection.ping";

export interface WsMessage {
  type: WsMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ============================================
// Agent 工作循环定义
// ============================================
interface TaskCycle {
  agentId: string;
  taskLabel: string;
  phases: {
    status: AgentInternalStatus;
    duration: [number, number]; // [min, max] ms
    progressRange?: [number, number];
    toolCall?: { name: string; cmd: string; result: string };
    message?: string;
    eventDetail?: string;
  }[];
}

// ============================================
// 模拟场景：AgentHub OS 开发
// ============================================
const SCENARIO: TaskCycle[] = [
  {
    agentId: "controller",
    taskLabel: "协调 AgentHub OS 开发流程",
    phases: [
      {
        status: "THINKING",
        duration: [3000, 5000],
        progressRange: [0, 25],
        message: "收到新需求：优化移动端 UI 体验",
        eventDetail: "接收用户需求，开始分析",
      },
      {
        status: "TOOL_CALL",
        duration: [2000, 3000],
        progressRange: [25, 40],
        toolCall: {
          name: "orchestrator.plan",
          cmd: "orchestrator.plan({tasks: ['UI优化','性能调优','测试']})",
          result: "任务规划完成，3个子任务待分配",
        },
        eventDetail: "任务拆解为 3 个子任务",
      },
      {
        status: "WORKING",
        duration: [2000, 4000],
        progressRange: [40, 60],
        message: "子任务已分配给 Research、Developer、Reviewer",
        eventDetail: "任务分配完成",
      },
      {
        status: "WAITING",
        duration: [8000, 15000],
        progressRange: [60, 80],
        message: "等待团队完成任务执行...",
        eventDetail: "等待各 Agent 执行结果",
      },
      {
        status: "TOOL_CALL",
        duration: [2000, 3000],
        progressRange: [80, 95],
        toolCall: {
          name: "orchestrator.review",
          cmd: "orchestrator.review({results: [research, dev, review]})",
          result: "所有子任务审核通过 ✓",
        },
        eventDetail: "汇总审核所有子任务结果",
      },
      {
        status: "DONE",
        duration: [4000, 6000],
        progressRange: [95, 100],
        message: "本轮任务周期完成。准备接收新任务。",
        eventDetail: "任务周期完成",
      },
    ],
  },
  {
    agentId: "research-1",
    taskLabel: "调研主流 AI Agent 平台 UI 设计",
    phases: [
      {
        status: "THINKING",
        duration: [2000, 4000],
        progressRange: [0, 20],
        message: "收到调研任务，确定搜索方向",
        eventDetail: "开始竞品调研",
      },
      {
        status: "TOOL_CALL",
        duration: [2500, 4000],
        progressRange: [20, 45],
        toolCall: {
          name: "web_search",
          cmd: 'web_search("AI agent platform UI design 2025")',
          result: "返回 15 条结果，包含 CrewAI、AutoGen、LangGraph",
        },
        eventDetail: "搜索 AI Agent 平台 UI 设计",
      },
      {
        status: "WORKING",
        duration: [3000, 5000],
        progressRange: [45, 70],
        message: "正在分析 CrewAI、AutoGen、LangGraph 的 UI 模式...",
        eventDetail: "分析竞品 UI 设计模式",
      },
      {
        status: "TOOL_CALL",
        duration: [2000, 3000],
        progressRange: [70, 85],
        toolCall: {
          name: "web_extract",
          cmd: 'web_extract(["docs.crewai.com", "langgraph.dev"])',
          result: "提取 3 篇详细文档，重点标注设计模式",
        },
        eventDetail: "提取竞品文档详情",
      },
      {
        status: "DONE",
        duration: [3000, 5000],
        progressRange: [85, 100],
        message: "调研完成。推荐采用三栏 Glassmorphism 方案，已生成报告。",
        eventDetail: "调研报告生成完毕",
      },
    ],
  },
  {
    agentId: "dev-1",
    taskLabel: "实现移动端工作事件流组件",
    phases: [
      {
        status: "THINKING",
        duration: [2000, 3000],
        progressRange: [0, 15],
        message: "分析移动端需求：时间线布局 + 折叠工具调用",
        eventDetail: "分析移动端组件需求",
      },
      {
        status: "WORKING",
        duration: [3000, 5000],
        progressRange: [15, 40],
        message: "正在编写 WorkflowEvent 组件...",
        eventDetail: "编写 WorkflowEvent 核心组件",
      },
      {
        status: "TOOL_CALL",
        duration: [1500, 2500],
        progressRange: [40, 55],
        toolCall: {
          name: "terminal",
          cmd: "npx tsc --noEmit",
          result: "✅ 类型检查通过，0 errors",
        },
        eventDetail: "TypeScript 类型检查通过",
      },
      {
        status: "WORKING",
        duration: [3000, 4000],
        progressRange: [55, 80],
        message: "集成到 MultiAgentChat，添加响应式断点...",
        eventDetail: "集成组件到主聊天模块",
      },
      {
        status: "TOOL_CALL",
        duration: [1500, 2500],
        progressRange: [80, 95],
        toolCall: {
          name: "terminal",
          cmd: "npm run build",
          result: "✅ 构建成功，0 warnings",
        },
        eventDetail: "项目构建验证通过",
      },
      {
        status: "DONE",
        duration: [3000, 4000],
        progressRange: [95, 100],
        message: "移动端工作事件流组件开发完成，待审核。",
        eventDetail: "移动端组件开发完成",
      },
    ],
  },
  {
    agentId: "design-1",
    taskLabel: "优化移动端 Glassmorphism 视觉",
    phases: [
      {
        status: "THINKING",
        duration: [2000, 3500],
        progressRange: [0, 25],
        message: "分析移动端视觉需求：玻璃拟态 + 紧凑布局",
        eventDetail: "分析移动端视觉规范",
      },
      {
        status: "WORKING",
        duration: [4000, 6000],
        progressRange: [25, 60],
        message: "调整卡片圆角、间距、字体层级以适应小屏...",
        eventDetail: "优化移动端设计令牌",
      },
      {
        status: "TOOL_CALL",
        duration: [1500, 2000],
        progressRange: [60, 75],
        toolCall: {
          name: "image_gen",
          cmd: 'generate_design("mobile glassmorphism dark theme")',
          result: "生成 3 套配色方案供选择",
        },
        eventDetail: "生成移动端配色方案",
      },
      {
        status: "WAITING",
        duration: [4000, 7000],
        progressRange: [75, 85],
        message: "等待 Developer 完成组件后联调视觉效果...",
        eventDetail: "等待前端组件完成",
      },
      {
        status: "DONE",
        duration: [2000, 3000],
        progressRange: [85, 100],
        message: "移动端视觉优化完成，深色玻璃拟态效果已确认。",
        eventDetail: "移动端视觉优化完成",
      },
    ],
  },
  {
    agentId: "reviewer-1",
    taskLabel: "审核移动端代码质量",
    phases: [
      {
        status: "WAITING",
        duration: [6000, 10000],
        progressRange: [0, 10],
        message: "等待 Developer 完成代码后开始审核...",
        eventDetail: "等待代码提交",
      },
      {
        status: "THINKING",
        duration: [2000, 3000],
        progressRange: [10, 30],
        message: "收到代码，开始分析架构和类型安全...",
        eventDetail: "开始代码审核",
      },
      {
        status: "TOOL_CALL",
        duration: [2000, 3000],
        progressRange: [30, 50],
        toolCall: {
          name: "code_review",
          cmd: "code_review({files: ['MultiAgentChat.tsx', 'WorkflowEvent.tsx']})",
          result: "发现 2 处类型优化建议，已标记",
        },
        eventDetail: "代码审查发现优化建议",
      },
      {
        status: "WORKING",
        duration: [2000, 4000],
        progressRange: [50, 80],
        message: "组件模块化良好，响应式断点正确。建议统一工具调用折叠动画。",
        eventDetail: "编写审查报告",
      },
      {
        status: "DONE",
        duration: [2000, 3000],
        progressRange: [80, 100],
        message: "代码审核通过 ✅。2 条优化建议已提交。",
        eventDetail: "代码审核通过",
      },
    ],
  },
];

// ============================================
// DAG 节点模拟
// ============================================
const DAG_MAP: Record<string, { nodeId: string; label: string }[]> = {
  controller: [
    { nodeId: "n1", label: "需求分析" },
    { nodeId: "n3", label: "内容策略" },
  ],
  "research-1": [{ nodeId: "n2", label: "竞品调研" }],
  "dev-1": [{ nodeId: "n5", label: "前端开发" }],
  "design-1": [{ nodeId: "n4", label: "视觉设计" }],
  "reviewer-1": [{ nodeId: "n6", label: "质量审核" }],
};

// ============================================
// Event Emitter 接口
// ============================================
type EventHandler = (msg: WsMessage) => void;

class MockEventStream {
  private handlers: EventHandler[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private cycleStates: Map<string, { phaseIdx: number; phaseTimer: number; paused: boolean }> = new Map();
  private running = false;

  // 连接状态回调（模拟 WS open/close）
  private onConnect?: () => void;
  private onDisconnect?: () => void;

  constructor() {
    // 初始化每个 Agent 的循环状态
    SCENARIO.forEach((cycle) => {
      this.cycleStates.set(cycle.agentId, {
        phaseIdx: 0,
        phaseTimer: 0,
        paused: false,
      });
    });
  }

  // ===== 公共 API（与真实 WebSocket 兼容） =====

  /** 注册事件处理器 */
  onMessage(handler: EventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  /** 设置连接回调 */
  onOpen(cb: () => void) { this.onConnect = cb; }
  onClose(cb: () => void) { this.onDisconnect = cb; }

  /** 启动模拟 */
  start() {
    if (this.running) return;
    this.running = true;

    // 模拟连接建立
    setTimeout(() => this.onConnect?.(), 300);

    // 错峰启动各 Agent，避免同时大量事件
    SCENARIO.forEach((cycle, idx) => {
      setTimeout(() => this.schedulePhase(cycle), idx * 800);
    });

    // 定期发送 ping
    this.intervals.push(
      setInterval(() => {
        this.emit("connection.ping", {});
      }, 15000)
    );
  }

  /** 停止模拟 */
  stop() {
    this.running = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.onDisconnect?.();
  }

  // ===== 内部：阶段调度 =====

  private schedulePhase(cycle: TaskCycle) {
    const state = this.cycleStates.get(cycle.agentId)!;
    if (!this.running) return;

    const phase = cycle.phases[state.phaseIdx];
    if (!phase) {
      // 循环结束，回到第一阶段
      state.phaseIdx = 0;
      this.schedulePhase(cycle);
      return;
    }

    const [min, max] = phase.duration;
    const delay = min + Math.random() * (max - min);

    // 立即发送当前阶段事件
    this.emitPhase(cycle, phase);

    // 发送中期进度更新（减少频率）
    if (phase.progressRange) {
      const midProgress = Math.round((phase.progressRange[0] + phase.progressRange[1]) / 2);
      const midDelay = delay * 0.5;
      setTimeout(() => {
        if (!this.running) return;
        this.emit("agent.progress", {
          agentId: cycle.agentId,
          progress: midProgress,
        });
      }, midDelay);
    }

    // 调度下一阶段
    const timer = setTimeout(() => {
      state.phaseIdx = (state.phaseIdx + 1) % cycle.phases.length;
      // 重置任务循环
      if (state.phaseIdx === 0 && cycle.agentId === "controller") {
        // Controller 完成后短暂空闲再开始
        setTimeout(() => this.schedulePhase(cycle), 3000);
      } else {
        this.schedulePhase(cycle);
      }
    }, delay);

    // 记录定时器以便清理
    this.intervals.push(timer as unknown as ReturnType<typeof setInterval>);
  }

  private emitPhase(cycle: TaskCycle, phase: TaskCycle["phases"][0]) {
    if (!this.running) return;

    // 批量事件：一次 dispatch 包含所有更新
    const batch: WsMessage[] = [];

    batch.push({
      type: "agent.status",
      payload: { agentId: cycle.agentId, status: phase.status },
      timestamp: Date.now(),
    });

    batch.push({
      type: "agent.task",
      payload: { agentId: cycle.agentId, task: cycle.taskLabel },
      timestamp: Date.now(),
    });

    if (phase.eventDetail) {
      batch.push({
        type: "event.log",
        payload: {
          agentId: cycle.agentId,
          event: getPhaseEventName(phase.status),
          detail: phase.eventDetail,
          level: phase.status === "ERROR" ? "error" : phase.status === "DONE" ? "success" : "info",
        },
        timestamp: Date.now(),
      });
    }

    if (phase.message && (phase.status === "TOOL_CALL" || phase.status === "DONE")) {
      batch.push({
        type: "chat.message",
        payload: {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          agentId: cycle.agentId,
          content: phase.message,
          type: phase.toolCall ? "tool_call" : "text",
          timestamp: new Date().toISOString(),
          toolName: phase.toolCall?.name,
          toolResult: phase.toolCall?.result,
        },
        timestamp: Date.now(),
      });
    }

    const dagNodes = DAG_MAP[cycle.agentId];
    if (dagNodes) {
      const node = dagNodes[Math.floor(Math.random() * dagNodes.length)];
      batch.push({
        type: "workflow.node",
        payload: {
          nodeId: node.nodeId,
          label: node.label,
          status: phase.status === "DONE" ? "completed" : phase.status === "ERROR" ? "error" : "active",
          progress: phase.progressRange?.[1] ?? 50,
          assignedAgent: cycle.agentId,
        },
        timestamp: Date.now(),
      });
    }

    // 单次批量分发
    this.handlers.forEach((h) => batch.forEach((msg) => h(msg)));
  }

  private emit(type: WsMessageType, payload: Record<string, unknown>) {
    const msg: WsMessage = { type, payload, timestamp: Date.now() };
    this.handlers.forEach((h) => h(msg));
  }
}

// ============================================
// 辅助
// ============================================
function getPhaseEventName(status: AgentInternalStatus): string {
  switch (status) {
    case "THINKING": return "开始思考";
    case "WORKING": return "开始执行";
    case "TOOL_CALL": return "工具调用";
    case "WAITING": return "等待协作";
    case "DONE": return "阶段完成";
    case "ERROR": return "异常";
    default: return "状态变更";
  }
}

// ============================================
// 导出单例
// ============================================
export const mockEventStream = new MockEventStream();

// ============================================
// 未来真实 WebSocket 接口适配器（占位）
// ============================================
export interface IEventStream {
  onMessage(handler: EventHandler): () => void;
  onOpen(cb: () => void): void;
  onClose(cb: () => void): void;
  start(): void;
  stop(): void;
}

export function createRealWebSocket(): IEventStream {
  // 未来实现：new WebSocket(url) + 消息解析
  throw new Error("Real WebSocket not implemented yet. Use mockEventStream instead.");
}
