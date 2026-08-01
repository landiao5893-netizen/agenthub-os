"use client";

import {
  BookOpen,
  Bot,
  Check,
  Circle,
  Database,
  Expand,
  GripVertical,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  Users,
  Workflow as WorkflowIcon,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DragEvent as ReactDragEvent, FormEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { orchestrator } from "@/controller/orchestrator";
import { PENDING_HOME_TASK_KEY } from "@/lib/home-task";
import { cn } from "@/lib/utils";
import { kbEngine, seedKnowledgeBase } from "@/knowledge/engine";
import type { KBDocument } from "@/knowledge/types";
import { useAgentStore } from "@/stores/agentStore";
import { useChatStore } from "@/stores/chatStore";
import { useUIStore } from "@/stores/uiStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import type { WorkflowNode } from "@/types";

type Point = { x: number; y: number };
type CanvasNode = WorkflowNode & {
  synthetic?: boolean;
  canvasKind?: "workflow" | "agent" | "knowledge" | "task";
  documentId?: string;
};
type ConnectionType = "flow" | "knowledge_input";
type CanvasEdge = { id?: string; from: string; to: string; type?: ConnectionType };
type CanvasDesignSnapshot = { workflowId: string; nodes: CanvasNode[]; edges: CanvasEdge[] };
let activeCanvasDesignSnapshot: CanvasDesignSnapshot | null = null;
type ConnectionDraft = { from: string; point: Point; type: ConnectionType };
type PaletteDragData =
  | { kind: "agent"; id: string }
  | { kind: "knowledge"; id: string }
  | { kind: "task" };

const PALETTE_MIME = "application/x-agenthub-workflow-node";
type SavedCanvasState = {
  positions: Record<string, Point>;
  resourceNodes: CanvasNode[];
  edges: CanvasEdge[];
  instructions?: Record<string, string>;
};
type SavedWorkflowSummary = {
  id: string;
  name: string;
  savedAt: number;
  nodeCount: number;
  agentCount: number;
  knowledgeCount: number;
};

const NODE_WIDTH = 214;
const NODE_HEIGHT = 132;
const LAYOUT_STORAGE_KEY = "ah_smart_workflow_layout_v3";
const SAVED_WORKFLOWS_KEY = "ah_saved_smart_workflows_v1";
const SAVED_WORKFLOW_EVENT = "agenthub:workflow-saved";

const FALLBACK_NODES: CanvasNode[] = [
  { id: "preview-controller", label: "理解目标并规划", assignedAgent: "controller", status: "pending", progress: 0, synthetic: true },
  { id: "preview-research", label: "研究与资料分析", assignedAgent: "research-1", status: "pending", progress: 0, synthetic: true },
  { id: "preview-content", label: "内容与方案生成", assignedAgent: "content-1", status: "pending", progress: 0, synthetic: true },
  { id: "preview-review", label: "质量审核与交付", assignedAgent: "reviewer-1", status: "pending", progress: 0, synthetic: true },
];

const FALLBACK_EDGES = FALLBACK_NODES.slice(0, -1).map((node, index) => ({
  from: node.id,
  to: FALLBACK_NODES[index + 1].id,
}));

function statusLabel(status: WorkflowNode["status"]) {
  if (status === "active") return "执行中";
  if (status === "completed") return "已完成";
  if (status === "error") return "需处理";
  return "等待";
}

function defaultPositions(nodes: CanvasNode[], _edges: { from: string; to: string }[]): Record<string, Point> {
  const positions: Record<string, Point> = {};
  nodes.forEach((node, index) => {
    positions[node.id] = {
      x: 72 + (index % 3) * 258,
      y: 72 + Math.floor(index / 3) * 178,
    };
  });
  return positions;
}

function readSavedCanvasState(workflowId: string): SavedCanvasState | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "{}") as Record<string, SavedCanvasState>;
    return all[workflowId] ?? null;
  } catch {
    return null;
  }
}

function writeSavedCanvasState(workflowId: string, state: SavedCanvasState) {
  const all = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "{}") as Record<string, SavedCanvasState>;
  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ ...all, [workflowId]: state }));
}

function readSavedWorkflows(): SavedWorkflowSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVED_WORKFLOWS_KEY) ?? "[]") as SavedWorkflowSummary[];
    return Array.isArray(saved) ? saved.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch {
    return [];
  }
}

function writeSavedWorkflow(summary: SavedWorkflowSummary) {
  const current = readSavedWorkflows().filter((item) => item.id !== summary.id);
  window.localStorage.setItem(SAVED_WORKFLOWS_KEY, JSON.stringify([summary, ...current].slice(0, 8)));
  window.dispatchEvent(new CustomEvent(SAVED_WORKFLOW_EVENT));
}

function connectionPath(from: Point, to: Point, type: ConnectionType = "flow") {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + 57;
  const endX = to.x;
  const endY = to.y + (type === "knowledge_input" ? 80 : 43);
  const direction = endX >= startX ? 1 : -1;
  const bend = Math.max(64, Math.abs(endX - startX) * 0.48);
  return `M ${startX} ${startY} C ${startX + bend * direction} ${startY}, ${endX - bend * direction} ${endY}, ${endX} ${endY}`;
}

function draftConnectionPath(from: Point, to: Point) {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + 57;
  const direction = to.x >= startX ? 1 : -1;
  const bend = Math.max(64, Math.abs(to.x - startX) * 0.48);
  return `M ${startX} ${startY} C ${startX + bend * direction} ${startY}, ${to.x - bend * direction} ${to.y}, ${to.x} ${to.y}`;
}

function NodeStatusIcon({ status }: { status: WorkflowNode["status"] }) {
  if (status === "active") return <Loader2 size={13} className="animate-spin" />;
  if (status === "completed") return <Check size={13} />;
  if (status === "error") return <X size={13} />;
  return <Circle size={11} />;
}

export function WorkflowCanvasPreview({ onOpen }: { onOpen: () => void }) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflowSummary[]>([]);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const agents = useAgentStore((state) => state.agents);
  const nodes = workflow?.nodes.length ? workflow.nodes.slice(0, 5) : FALLBACK_NODES;
  const completed = nodes.filter((node) => node.status === "completed").length;

  useEffect(() => {
    const refresh = () => setSavedWorkflows(readSavedWorkflows());
    refresh();
    window.addEventListener(SAVED_WORKFLOW_EVENT, refresh);
    return () => window.removeEventListener(SAVED_WORKFLOW_EVENT, refresh);
  }, []);

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2"><WorkflowIcon size={16} className="text-violet-600" /><h2 className="text-[14px] font-semibold">智能工作流</h2></div>
          <p className="mt-1 text-[11px] text-slate-400">从目标规划到审核交付，实时查看 AI 团队协作路径</p>
        </div>
        <button type="button" onClick={onOpen} className="flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[11px] font-medium text-slate-600 hover:border-violet-200 hover:text-violet-700">
          <Expand size={13} />打开智能工作流
        </button>
      </div>
      {savedWorkflows.length > 0 && <div className="grid gap-2 border-b border-slate-100 px-5 py-4 sm:grid-cols-2">{savedWorkflows.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={onOpen} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-3 text-left hover:border-violet-200 hover:bg-violet-50/40"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-600"><WorkflowIcon size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-800">{item.name}</span><span className="mt-1 block text-[9px] text-slate-400">{item.agentCount} 名员工 · {item.knowledgeCount} 份资料 · {item.nodeCount} 个节点</span></span><span className="text-[9px] text-slate-400">已保存</span></button>)}</div>}
      <button type="button" onClick={onOpen} className="block w-full p-5 text-left hover:bg-slate-50/60">
        <div className="flex min-w-max items-center gap-2 overflow-hidden">
          {nodes.map((node, index) => {
            const agent = agents.find((item) => item.id === node.assignedAgent);
            return (
              <div key={node.id} className="contents">
                <div className={cn("flex w-[154px] shrink-0 items-center gap-2.5 rounded-md border px-3 py-3", node.status === "active" ? "border-violet-300 bg-violet-50" : node.status === "completed" ? "border-emerald-200 bg-emerald-50" : node.status === "error" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white")}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-sm shadow-sm">{agent?.avatar ?? "AI"}</span>
                  <span className="min-w-0"><span className="block truncate text-[11px] font-medium text-slate-800">{node.label}</span><span className="mt-1 block truncate text-[9px] text-slate-400">{agent?.name.replace(" Agent", "") ?? "AI 团队"}</span></span>
                </div>
                {index < nodes.length - 1 && <span className="h-px w-6 shrink-0 bg-slate-300" />}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3 text-[10px] text-slate-400">
          <span className={cn("h-2 w-2 rounded-full", isRunning ? "bg-emerald-500" : "bg-slate-300")} />
          <span>{workflow ? `${completed}/${nodes.length} 个阶段已完成` : "标准工作流已就绪"}</span>
          <span className="ml-auto">{workflow?.name ?? "等待新目标"}</span>
        </div>
      </button>
    </section>
  );
}

export function SmartWorkflowCanvas() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const eventLogs = useWorkflowStore((state) => state.eventLogs);
  const agents = useAgentStore((state) => state.agents);
  const addMessage = useChatStore((state) => state.addMessage);
  const openSideChat = useUIStore((state) => state.openSideChat);
  const [goal, setGoal] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [resourceNodes, setResourceNodes] = useState<CanvasNode[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdge[]>([]);
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KBDocument[]>([]);
  const [saved, setSaved] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [designLock, setDesignLock] = useState<{
    workflowId: string;
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  } | null>(null);
  const designLockRef = useRef<typeof designLock>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingHandled = useRef(false);
  const hydratedWorkflowIdRef = useRef<string | null>(null);
  const dragRef = useRef<{ id?: string; startX: number; startY: number; origin: Point; panning?: boolean } | null>(null);

  const activeDesignLock = designLockRef.current ?? designLock ?? activeCanvasDesignSnapshot;
  const liveWorkflowNodes: CanvasNode[] = useMemo(() => workflow?.nodes.length ? workflow.nodes : FALLBACK_NODES, [workflow]);
  const liveWorkflowEdges = useMemo<CanvasEdge[]>(() => workflow?.nodes.length ? workflow.edges : FALLBACK_EDGES, [workflow]);
  const workflowNodes = useMemo<CanvasNode[]>(() => {
    if (!activeDesignLock) return liveWorkflowNodes;
    return activeDesignLock.nodes.map((node) => {
      const runtimeNode = liveWorkflowNodes.find((item) => item.id === node.id)
        ?? liveWorkflowNodes.find((item) => item.assignedAgent && item.assignedAgent === node.assignedAgent);
      return runtimeNode ? { ...node, status: runtimeNode.status, progress: runtimeNode.progress } : node;
    });
  }, [activeDesignLock, liveWorkflowNodes]);
  const workflowEdges = activeDesignLock?.edges ?? liveWorkflowEdges;
  const workflowId = activeDesignLock?.workflowId ?? workflow?.id ?? "agenthub-default";
  const workflowStructureKey = workflowNodes.map((node) => node.id).join("|");
  const nodes = useMemo(() => [...workflowNodes, ...resourceNodes.filter((node) => !workflowNodes.some((item) => item.id === node.id))], [resourceNodes, workflowNodes]);
  const progressNodes = workflowNodes.filter((node) => node.canvasKind !== "knowledge");
  const progress = progressNodes.length ? Math.round(progressNodes.reduce((sum, node) => sum + node.progress, 0) / progressNodes.length) : 0;
  const layoutSourceRef = useRef({ workflowNodes, workflowEdges, applyFit: null as null | ((source: Record<string, Point>) => void) });

  const applyFit = useCallback((source: Record<string, Point>) => {
    const viewport = viewportRef.current;
    if (!viewport || nodes.length === 0 || Object.keys(source).length === 0) return;
    const points = nodes.map((node) => source[node.id]).filter(Boolean);
    if (!points.length) return;
    const minX = Math.min(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxX = Math.max(...points.map((point) => point.x + NODE_WIDTH));
    const maxY = Math.max(...points.map((point) => point.y + NODE_HEIGHT));
    const nextZoom = Math.min(1.08, Math.max(0.3, Math.min((viewport.clientWidth - 112) / (maxX - minX), (viewport.clientHeight - 112) / (maxY - minY))));
    setZoom(nextZoom);
    setPan({
      x: (viewport.clientWidth - (maxX - minX) * nextZoom) / 2 - minX * nextZoom,
      y: (viewport.clientHeight - (maxY - minY) * nextZoom) / 2 - minY * nextZoom,
    });
  }, [nodes]);

  useEffect(() => {
    let active = true;
    void seedKnowledgeBase().then(() => {
      if (active) setKnowledgeDocs(kbEngine.getAll());
    });
    setKnowledgeDocs(kbEngine.getAll());
    return () => { active = false; };
  }, []);

  layoutSourceRef.current = { workflowNodes, workflowEdges, applyFit };

  useEffect(() => {
    hydratedWorkflowIdRef.current = null;
    setCanvasReady(false);
    const savedState = readSavedCanvasState(workflowId);
    const resources = savedState?.resourceNodes ?? [];
    const currentSource = layoutSourceRef.current;
    const graphNodes = [...currentSource.workflowNodes, ...resources.filter((node) => !currentSource.workflowNodes.some((item) => item.id === node.id))];
    const seenEdgeIds = new Set<string>();
    const graphEdges = (savedState ? savedState.edges : currentSource.workflowEdges).map((edge, index) => {
      const baseId = edge.id ?? ["edge", edge.from, edge.to, edge.type ?? "flow", index].join("-");
      let edgeId = baseId;
      let duplicateIndex = 1;
      while (seenEdgeIds.has(edgeId)) edgeId = [baseId, duplicateIndex++].join("-");
      seenEdgeIds.add(edgeId);
      return { ...edge, id: edgeId };
    });
    const generated = defaultPositions(graphNodes, graphEdges);
    const next = { ...generated, ...(savedState?.positions ?? {}) };
    setResourceNodes(resources);
    setCanvasEdges(graphEdges);
    setInstructions(savedState?.instructions ?? {});
    setPositions(next);
    setSelectedId(graphNodes.find((node) => node.status === "active")?.id ?? graphNodes[0]?.id ?? null);
    const timer = window.setTimeout(() => {
      currentSource.applyFit?.(next);
      hydratedWorkflowIdRef.current = workflowId;
      setCanvasReady(true);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [workflowId, workflowStructureKey]); // Layout only resets when the workflow structure changes.

  useEffect(() => {
    if (!canvasReady || hydratedWorkflowIdRef.current !== workflowId) return;
    try {
      writeSavedCanvasState(workflowId, { positions, resourceNodes, edges: canvasEdges, instructions });
    } catch {
      // Keep the editable graph in memory if browser storage is unavailable.
    }
  }, [canvasEdges, canvasReady, instructions, positions, resourceNodes, workflowId]);

  useEffect(() => {
    const active = nodes.find((node) => node.status === "active");
    if (active) setSelectedId(active.id);
  }, [nodes]);

  const executeGoal = useCallback((raw: string) => {
    const task = raw.trim();
    if (!task || isRunning) return;
    setGoal("");
    addMessage({ id: `execution-user-${Date.now()}`, agentId: "controller", role: "user", channel: "execution", content: task, type: "text", timestamp: new Date() });
    void orchestrator.execute(task);
  }, [addMessage, isRunning]);

  useEffect(() => {
    if (pendingHandled.current) return;
    pendingHandled.current = true;
    const pending = window.sessionStorage.getItem(PENDING_HOME_TASK_KEY)?.trim();
    if (!pending) return;
    window.sessionStorage.removeItem(PENDING_HOME_TASK_KEY);
    executeGoal(pending);
  }, [executeGoal]);

  const startNodeDrag = (event: ReactPointerEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(id);
    setSelectedEdgeId(null);
    dragRef.current = { id, startX: event.clientX, startY: event.clientY, origin: positions[id] ?? { x: 0, y: 0 } };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const toCanvasPoint = (clientX: number, clientY: number): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  };

  const startConnection = (event: ReactPointerEvent, nodeId: string, type: ConnectionType) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(nodeId);
    setConnectionDraft({ from: nodeId, point: toCanvasPoint(event.clientX, event.clientY), type });
  };

  const finishConnection = (event: ReactPointerEvent, nodeId: string, toPort: ConnectionType) => {
    event.preventDefault();
    event.stopPropagation();
    if (!connectionDraft || connectionDraft.from === nodeId || connectionDraft.type !== toPort) {
      setConnectionDraft(null);
      return;
    }
    const sourceNode = nodes.find((node) => node.id === connectionDraft.from);
    const targetNode = nodes.find((node) => node.id === nodeId);
    const knowledgeNode = sourceNode?.canvasKind === "knowledge" ? sourceNode : targetNode?.canvasKind === "knowledge" ? targetNode : null;
    const agentNode = sourceNode?.assignedAgent ? sourceNode : targetNode?.assignedAgent ? targetNode : null;
    if (connectionDraft.type === "knowledge_input" && knowledgeNode?.documentId && agentNode?.assignedAgent) {
      const currentAccess = kbEngine.getAccess(agentNode.assignedAgent) ?? { agentId: agentNode.assignedAgent, allowedCategories: [], allowedDocIds: [], deniedDocIds: [] };
      kbEngine.setAccess(agentNode.assignedAgent, {
        ...currentAccess,
        allowedDocIds: Array.from(new Set([...currentAccess.allowedDocIds, knowledgeNode.documentId])),
        deniedDocIds: currentAccess.deniedDocIds.filter((id) => id !== knowledgeNode.documentId),
      });
    }
    setCanvasEdges((current) => current.some((edge) => edge.from === connectionDraft.from && edge.to === nodeId)
      ? current
      : [...current, { id: `edge-${Date.now()}`, from: connectionDraft.from, to: nodeId, type: connectionDraft.type }]);
    setSelectedEdgeId(null);
    setConnectionDraft(null);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const nextZoom = Math.min(1.8, Math.max(0.3, zoom + (event.deltaY > 0 ? -0.1 : 0.1)));
    const canvasX = (event.clientX - rect.left - pan.x) / zoom;
    const canvasY = (event.clientY - rect.top - pan.y) / zoom;
    setZoom(nextZoom);
    setPan({
      x: event.clientX - rect.left - canvasX * nextZoom,
      y: event.clientY - rect.top - canvasY * nextZoom,
    });
  };

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-workflow-node], [data-workflow-port], [data-workflow-edge]")) return;
    setSelectedId(null);
    setSelectedEdgeId(null);
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: pan, panning: true };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (connectionDraft) {
      setConnectionDraft((current) => current ? { ...current, point: toCanvasPoint(event.clientX, event.clientY) } : null);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.panning) {
      setPan({ x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY });
      return;
    }
    if (drag.id) {
      setPositions((current) => ({ ...current, [drag.id!]: { x: drag.origin.x + (event.clientX - drag.startX) / zoom, y: drag.origin.y + (event.clientY - drag.startY) / zoom } }));
    }
  };

  const saveLayout = () => {
    try {
      writeSavedCanvasState(workflowId, { positions, resourceNodes, edges: canvasEdges, instructions });
      writeSavedWorkflow({
        id: workflowId,
        name: workflow?.name
          ?? instructions[Object.keys(instructions).find((id) => id.startsWith("canvas-task-")) ?? ""]?.trim()
          ?? instructions[nodes.find((node) => node.assignedAgent === "controller")?.id ?? ""]?.trim()
          ?? "未命名智能工作流",
        savedAt: Date.now(),
        nodeCount: nodes.length,
        agentCount: nodes.filter((node) => Boolean(node.assignedAgent)).length,
        knowledgeCount: nodes.filter((node) => node.canvasKind === "knowledge").length,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setSaved(false);
    }
  };

  const updateInstruction = (nodeId: string, value: string) => {
    setInstructions((current) => ({ ...current, [nodeId]: value }));
  };

  const runnableGoal = goal.trim()
    || nodes.filter((node) => node.canvasKind === "task").map((node) => instructions[node.id]?.trim()).find(Boolean)
    || instructions[nodes.find((node) => node.assignedAgent === "controller")?.id ?? ""]?.trim()
    || "";
  const runDesignedWorkflow = () => {
    if (!runnableGoal || isRunning) return;
    saveLayout();
    const designSnapshot = { workflowId, nodes: [...nodes], edges: [...canvasEdges] };
    activeCanvasDesignSnapshot = designSnapshot;
    designLockRef.current = designSnapshot;
    flushSync(() => setDesignLock(designSnapshot));
    const nodeName = (nodeId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      const agent = agents.find((item) => item.id === node?.assignedAgent);
      return agent?.name.replace(" Agent", "") ?? node?.label ?? nodeId;
    };
    const flowRules = canvasEdges
      .filter((edge) => edge.type !== "knowledge_input")
      .map((edge) => `- ${nodeName(edge.from)} -> ${nodeName(edge.to)}`);
    const stageRules = nodes
      .filter((node) => node.assignedAgent && instructions[node.id]?.trim())
      .map((node) => `- ${nodeName(node.id)}: ${instructions[node.id].trim()}`);
    const knowledgeRules = canvasEdges
      .filter((edge) => edge.type === "knowledge_input")
      .map((edge) => `- ${nodeName(edge.to)} 使用资料《${nodeName(edge.from)}》`);
    const sections = [
      `任务目标：${runnableGoal}`,
      flowRules.length ? `执行顺序：\n${flowRules.join("\n")}` : "",
      stageRules.length ? `各员工阶段指令：\n${stageRules.join("\n")}` : "",
      knowledgeRules.length ? `知识库约束：\n${knowledgeRules.join("\n")}` : "",
      "请 Controller 按以上智能工作流组织执行并完成最终交付。",
    ].filter(Boolean);
    executeGoal(sections.join("\n\n"));
  };

  const startPaletteDrag = (event: ReactDragEvent<HTMLElement>, data: PaletteDragData) => {
    event.dataTransfer.setData(PALETTE_MIME, JSON.stringify(data));
    event.dataTransfer.effectAllowed = "copy";
  };

  const dropPaletteNode = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData(PALETTE_MIME);
    if (!raw) return;
    let data: PaletteDragData;
    try {
      data = JSON.parse(raw) as PaletteDragData;
    } catch {
      return;
    }

    const dropPoint = toCanvasPoint(event.clientX, event.clientY);
    const point = { x: dropPoint.x - NODE_WIDTH / 2, y: dropPoint.y - NODE_HEIGHT / 2 };
    let node: CanvasNode | null = null;

    if (data.kind === "agent") {
      const agent = agents.find((item) => item.id === data.id);
      if (!agent || nodes.some((item) => item.assignedAgent === agent.id)) return;
      node = { id: `canvas-agent-${agent.id}`, label: agent.roleLabel || agent.name, assignedAgent: agent.id, status: "pending", progress: 0, synthetic: true, canvasKind: "agent" };
    } else if (data.kind === "knowledge") {
      const document = knowledgeDocs.find((item) => item.id === data.id);
      if (!document || nodes.some((item) => item.documentId === document.id)) return;
      node = { id: `canvas-knowledge-${document.id}`, label: document.title, status: "pending", progress: 0, synthetic: true, canvasKind: "knowledge", documentId: document.id };
    } else {
      const id = `canvas-task-${Date.now()}`;
      node = { id, label: "任务节点", status: "pending", progress: 0, synthetic: true, canvasKind: "task" };
    }

    setResourceNodes((current) => [...current, node!]);
    setPositions((current) => ({ ...current, [node!.id]: point }));
    setSelectedId(node.id);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setCanvasEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  const removeResourceNode = (nodeId: string) => {
    setResourceNodes((current) => current.filter((node) => node.id !== nodeId));
    setCanvasEdges((current) => current.filter((edge) => edge.from !== nodeId && edge.to !== nodeId));
    setPositions((current) => {
      const next = { ...current };
      delete next[nodeId];
      return next;
    });
    setSelectedId((current) => current === nodeId ? null : current);
  };

  const shortcutActionsRef = useRef({ save: saveLayout, run: runDesignedWorkflow, removeEdge: deleteSelectedEdge, removeNode: removeResourceNode });
  shortcutActionsRef.current = { save: saveLayout, run: runDesignedWorkflow, removeEdge: deleteSelectedEdge, removeNode: removeResourceNode };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeId) {
        event.preventDefault();
        shortcutActionsRef.current.removeEdge();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedId && resourceNodes.some((node) => node.id === selectedId)) {
        event.preventDefault();
        shortcutActionsRef.current.removeNode(selectedId);
      } else if (event.key === "Escape") {
        setSelectedEdgeId(null);
        setSelectedId(null);
        setConnectionDraft(null);
      } else if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        shortcutActionsRef.current.save();
      } else if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        shortcutActionsRef.current.run();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resourceNodes, selectedEdgeId, selectedId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    runDesignedWorkflow();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6fb]">
      <header className="relative z-30 flex h-[68px] shrink-0 items-center border-b border-slate-200 bg-white px-4 md:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-md bg-violet-50 text-violet-700"><WorkflowIcon size={17} /></span><div><h1 className="truncate text-[14px] font-semibold text-slate-900">{workflow?.name ?? "智能工作流"}</h1><p className="mt-0.5 text-[10px] text-slate-400">Controller 规划 · Agent 执行 · Supervisor 审核</p></div></div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={cn("mr-2 hidden rounded-full px-2.5 py-1 text-[10px] font-medium sm:inline-flex", isRunning ? "bg-emerald-50 text-emerald-700" : workflow ? "bg-slate-100 text-slate-600" : "bg-violet-50 text-violet-700")}>{isRunning ? `执行中 ${progress}%` : workflow ? `进度 ${progress}%` : "等待目标"}</span>
          <button type="button" onClick={runDesignedWorkflow} disabled={!runnableGoal || isRunning} className="hidden h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[10px] font-medium text-white hover:bg-violet-700 disabled:bg-slate-200 sm:flex"><Play size={13} />运行</button>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.4, value - 0.12))} className="hidden h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 md:grid" title="缩小"><ZoomOut size={14} /></button>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + 0.12))} className="hidden h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 md:grid" title="放大"><ZoomIn size={14} /></button>
          <button type="button" onClick={() => applyFit(positions)} className="hidden h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 md:grid" title="适应画布"><Expand size={14} /></button>
          <button type="button" onClick={saveLayout} className="hidden h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[10px] text-slate-600 hover:bg-slate-50 sm:flex"><Save size={13} />{saved ? "已保存" : "保存工作流"}</button>
          {selectedEdgeId && <button type="button" onClick={deleteSelectedEdge} className="hidden h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-medium text-rose-700 hover:bg-rose-100 sm:flex"><Trash2 size={13} />删除连线</button>}
          {isRunning && <button type="button" onClick={() => orchestrator.stop()} className="flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-medium text-rose-700"><Pause size={13} />停止</button>}
        </div>
      </header>

      <div className="hidden min-h-0 flex-1 md:flex">
        <aside className="flex w-[184px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800"><GripVertical size={14} className="text-violet-500" />节点库</div>
            <p className="mt-1 text-[9px] leading-4 text-slate-400">拖到右侧画布，再通过端口连线</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400"><Users size={12} />AI 员工</div>
              <div className="space-y-1">
                {agents.map((agent) => {
                  const used = nodes.some((node) => node.assignedAgent === agent.id);
                  return <div key={agent.id} data-palette-node draggable={!used} onDragStart={(event) => startPaletteDrag(event, { kind: "agent", id: agent.id })} className={cn("flex items-center gap-2 rounded-md border px-2 py-2", used ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50" : "cursor-grab border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 active:cursor-grabbing")}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-50 text-sm">{agent.avatar}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium text-slate-700">{agent.name.replace(" Agent", "")}</span><span className="mt-0.5 block truncate text-[8px] text-slate-400">{agent.roleLabel}</span></span>{used && <span className="text-[8px] text-slate-400">已接入</span>}</div>;
                })}
              </div>
            </div>
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400"><BookOpen size={12} />知识库</div>
              <div className="space-y-1">
                {knowledgeDocs.map((document) => {
                  const used = nodes.some((node) => node.documentId === document.id);
                  return <div key={document.id} data-palette-node draggable={!used} onDragStart={(event) => startPaletteDrag(event, { kind: "knowledge", id: document.id })} className={cn("flex items-center gap-2 rounded-md border px-2 py-2", used ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50" : "cursor-grab border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/40 active:cursor-grabbing")}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-600"><Database size={13} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium text-slate-700">{document.title}</span><span className="mt-0.5 block truncate text-[8px] text-slate-400">{document.category}</span></span>{used && <span className="text-[8px] text-slate-400">已接入</span>}</div>;
                })}
                {!knowledgeDocs.length && <div className="rounded-md border border-dashed border-slate-200 px-2 py-4 text-center text-[9px] text-slate-400">暂无知识资料</div>}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400"><Target size={12} />任务</div>
              <div data-palette-node draggable onDragStart={(event) => startPaletteDrag(event, { kind: "task" })} className="flex cursor-grab items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 hover:border-amber-300 hover:bg-amber-50/40 active:cursor-grabbing"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-600"><Target size={13} /></span><span className="min-w-0"><span className="block text-[10px] font-medium text-slate-700">任务节点</span><span className="mt-0.5 block text-[8px] text-slate-400">定义工作目标</span></span></div>
            </div>
          </div>
        </aside>
        <div ref={viewportRef} data-workflow-dropzone onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={dropPaletteNode} onWheel={handleWheel} onPointerDown={startPan} onPointerMove={movePointer} onPointerUp={() => { dragRef.current = null; setConnectionDraft(null); }} onPointerCancel={() => { dragRef.current = null; setConnectionDraft(null); }} className="relative min-w-0 flex-1 touch-none overflow-hidden bg-[#f8f9fd]" style={{ backgroundImage: "radial-gradient(circle, rgba(100,116,139,.18) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          <div className="absolute left-0 top-0 h-full w-full origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <svg className="absolute left-0 top-0 h-[1800px] w-[2600px] overflow-visible">
              {canvasEdges.map((edge) => {
                const from = positions[edge.from];
                const to = positions[edge.to];
                if (!from || !to) return null;
                const source = nodes.find((node) => node.id === edge.from);
                const color = source?.status === "completed" ? "#10b981" : source?.status === "active" ? "#7c3aed" : "#cbd5e1";
                const path = connectionPath(from, to, edge.type);
                const edgeId = edge.id ?? `edge-${edge.from}-${edge.to}`;
                const selected = selectedEdgeId === edgeId;
                return <g key={edgeId} data-workflow-edge>
                  <path d={path} fill="none" stroke="transparent" strokeWidth="16" className="cursor-pointer" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedEdgeId(edgeId); setSelectedId(null); }} />
                  <path d={path} fill="none" stroke={selected ? "#ef4444" : edge.type === "knowledge_input" ? "#06b6d4" : color} strokeWidth={selected ? 3 : 2} strokeDasharray={selected ? "6 4" : source?.status === "active" ? "7 5" : undefined} className="pointer-events-none" />
                </g>;
              })}
              {connectionDraft && positions[connectionDraft.from] && <path className="pointer-events-none" d={draftConnectionPath(positions[connectionDraft.from], connectionDraft.point)} fill="none" stroke={connectionDraft.type === "knowledge_input" ? "#06b6d4" : "#7c3aed"} strokeWidth="2" strokeDasharray="6 5" />}
            </svg>
            {nodes.map((node) => {
              const point = positions[node.id];
              if (!point) return null;
              const agent = agents.find((item) => item.id === node.assignedAgent);
              const selected = selectedId === node.id;
              return (
                <article key={node.id} data-workflow-node className={cn("absolute flex h-[132px] w-[214px] flex-col overflow-visible rounded-lg border bg-white shadow-[0_8px_24px_rgba(15,23,42,.07)] transition-[border-color,box-shadow]", selected ? "border-violet-400 shadow-[0_10px_30px_rgba(124,58,237,.14)]" : node.status === "active" ? "border-violet-300" : node.status === "error" ? "border-rose-300" : "border-slate-200")} style={{ left: point.x, top: point.y }}>
                  <div onPointerDown={(event) => startNodeDrag(event, node.id)} className="flex cursor-grab items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 active:cursor-grabbing">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-50 text-base">{node.canvasKind === "knowledge" ? <Database size={16} /> : node.canvasKind === "task" ? <Target size={16} /> : agent?.avatar ?? <Bot size={16} />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-800">{node.label}</span><span className="mt-0.5 block truncate text-[9px] text-slate-400">{node.canvasKind === "knowledge" ? "知识库资料" : node.canvasKind === "task" ? "工作目标" : agent?.name.replace(" Agent", "") ?? "AI Team"}</span></span>
                    <span className={cn("grid h-6 w-6 place-items-center rounded-full", node.status === "completed" ? "bg-emerald-50 text-emerald-600" : node.status === "active" ? "bg-violet-50 text-violet-600" : node.status === "error" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-300")}><NodeStatusIcon status={node.status} /></span>
                  </div>
                  <div className="flex flex-1 items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">{node.canvasKind === "knowledge" ? <div className="flex h-7 items-center rounded-md bg-cyan-50 px-2 text-[9px] text-cyan-700">作为资料上下文提供给员工</div> : <input value={instructions[node.id] ?? ""} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => updateInstruction(node.id, event.target.value)} placeholder={node.canvasKind === "task" ? "输入任务目标" : "输入阶段指令"} className="h-7 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[9px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300" />}<div className="mt-1.5 flex items-center gap-2"><span className="text-[8px] text-slate-400">{statusLabel(node.status)}</span><div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full transition-[width]", node.status === "error" ? "bg-rose-500" : node.status === "completed" ? "bg-emerald-500" : "bg-violet-500")} style={{ width: `${node.progress}%` }} /></div><span className="text-[8px] font-medium text-slate-500">{node.progress}%</span></div></div>
                    {node.canvasKind && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => removeResourceNode(node.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600" title="移除节点"><Trash2 size={13} /></button>}
                    {agent && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => openSideChat(agent.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-400 hover:border-violet-200 hover:text-violet-600" title={`与 ${agent.name} 私聊`}><MessageCircle size={13} /></button>}
                  </div>
                  {node.canvasKind !== "knowledge" && <button type="button" data-workflow-port onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => finishConnection(event, node.id, "flow")} className="absolute -left-[9px] top-[34px] z-20 h-[18px] w-[18px] rounded-full border-[3px] border-white bg-slate-400 shadow-[0_0_0_1px_rgba(148,163,184,.45)] transition-transform hover:scale-125 hover:bg-violet-500" title="流程输入" aria-label={`流程连接到 ${node.label}`} />}
                  {node.canvasKind !== "knowledge" && node.canvasKind !== "task" && agent && (["controller", "research", "content", "design", "developer", "reviewer", "analyst"].includes(agent.role) || agent.tools.includes("knowledge_retrieval")) && <button type="button" data-workflow-port onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => finishConnection(event, node.id, "knowledge_input")} className="absolute -left-[9px] top-[71px] z-20 h-[18px] w-[18px] rounded-full border-[3px] border-white bg-cyan-500 shadow-[0_0_0_1px_rgba(6,182,212,.4)] transition-transform hover:scale-125" title="知识接入" aria-label={`知识连接到 ${node.label}`} />}
                  <button type="button" data-workflow-port onPointerDown={(event) => startConnection(event, node.id, node.canvasKind === "knowledge" ? "knowledge_input" : "flow")} className={cn("absolute -right-[9px] top-[48px] z-20 h-[18px] w-[18px] cursor-crosshair rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgba(124,58,237,.4)] transition-transform hover:scale-125", node.canvasKind === "knowledge" ? "bg-cyan-500" : "bg-violet-500")} title={node.canvasKind === "knowledge" ? "知识输出" : "流程输出"} aria-label={`从 ${node.label} 创建${node.canvasKind === "knowledge" ? "知识" : "流程"}连接`} />
                </article>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 flex max-w-[420px] items-center gap-2 rounded-md border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <Sparkles size={13} className="shrink-0 text-violet-600" />
            <p className="truncate text-[10px] text-slate-500">{eventLogs.at(-1)?.detail ?? "从左侧节点库拖入员工、知识库或任务，再拖动端口完成连线。"}</p>
          </div>
        </div>

      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:hidden">
        <div className="space-y-2">
          {nodes.map((node, index) => {
            const agent = agents.find((item) => item.id === node.assignedAgent);
            return <div key={node.id}><button type="button" onClick={() => agent && openSideChat(agent.id)} className={cn("flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left", node.status === "active" ? "border-violet-300" : node.status === "error" ? "border-rose-300" : "border-slate-200")}><span className="grid h-9 w-9 place-items-center rounded-md bg-slate-50 text-base">{agent?.avatar ?? "AI"}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-slate-800">{node.label}</span><span className="mt-1 block text-[10px] text-slate-400">{agent?.name.replace(" Agent", "") ?? "AI 团队"} · {statusLabel(node.status)}</span></span><span className="text-[10px] font-medium text-slate-500">{node.progress}%</span></button>{index < nodes.length - 1 && <span className="mx-auto block h-3 w-px bg-slate-300" />}</div>;
          })}
        </div>
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white p-3 md:px-5">
        <div className="mx-auto flex max-w-[980px] items-center gap-2 rounded-lg border border-slate-300 bg-white p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-50">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-600"><Sparkles size={16} /></span>
          <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder={workflow ? "补充目标或发起一个新任务" : "输入目标，AI 团队将自动生成并执行工作流"} className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-slate-800 outline-none placeholder:text-slate-400" />
          <button type="submit" disabled={!goal.trim() || isRunning} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200" aria-label="运行工作流">{isRunning ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
        </div>
      </form>
    </div>
  );
}
