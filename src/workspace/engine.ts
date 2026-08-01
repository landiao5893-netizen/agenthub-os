// ============================================
// Workspace Engine — 共享工作空间管理
// 存储 + 自动流转 + 白板生成
// ============================================

import {
  SharedWorkspace, WorkspaceEntry, WorkspaceArtifact,
  WhiteboardView, WhiteboardColumn,
  DEFAULT_FLOWS, FlowRelation,
} from "./types";
import { getAgentProfile } from "@/lib/agent-profiles";
import { useChatStore } from "@/stores/chatStore";

const WORKSPACE_STORAGE_KEY = 'ah_workspaces';

type PersistedWorkspace = Omit<SharedWorkspace, 'flowMap'> & { flowMap?: [string, string[]][] };

function canUseWorkspaceStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

class WorkspaceEngine {
  private workspaces: Map<string, SharedWorkspace> = new Map();
  private flows: FlowRelation[] = [...DEFAULT_FLOWS];
  private hydrated = false;

  private hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    if (!canUseWorkspaceStorage()) return;
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedWorkspace[];
      if (!Array.isArray(parsed)) return;
      parsed.forEach((item) => {
        if (!item?.projectId) return;
        const ws: SharedWorkspace = {
          ...item,
          flowMap: new Map(item.flowMap ?? []),
          entries: Array.isArray(item.entries) ? item.entries : [],
        };
        this.workspaces.set(ws.projectId, ws);
      });
      const latest = parsed.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
      if (latest?.projectId) {
        const ws = this.workspaces.get(latest.projectId);
        if (ws) this.workspaces.set('current', ws);
      }
    } catch {
      // Ignore invalid persisted workspace data.
    }
  }

  private persist() {
    if (!canUseWorkspaceStorage()) return;
    try {
      const unique = Array.from(this.workspaces.entries())
        .filter(([key]) => key !== 'current')
        .map(([, ws]) => ({ ...ws, flowMap: Array.from(ws.flowMap.entries()) }));
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(unique.slice(-10)));
    } catch {
      // Keep runtime workspace even when localStorage is unavailable.
    }
  }

  // ===== 创建工作空间 =====
  create(projectId: string, projectName: string): SharedWorkspace {
    this.hydrate();
    const ws: SharedWorkspace = {
      projectId, projectName,
      entries: [],
      flowMap: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.workspaces.set(projectId, ws);
    this.workspaces.set("current", ws);
    this.persist();
    return ws;
  }

  get(projectId: string): SharedWorkspace | undefined {
    this.hydrate();
    return this.workspaces.get(projectId);
  }

  // ===== 设置项目真实流转关系 =====
  setProjectFlows(projectId: string, flows: FlowRelation[]) {
    this.hydrate();
    const ws = this.workspaces.get(projectId);
    if (ws) {
      ws.flowMap = this.buildFlowMap(flows);
      ws.updatedAt = Date.now();
      this.persist();
    }
  }

  private getFlowsForProject(projectId: string): FlowRelation[] {
    this.hydrate();
    const ws = this.workspaces.get(projectId);
    if (!ws || ws.flowMap.size === 0) return this.flows;
    return Array.from(ws.flowMap.entries()).flatMap(([from, targets]) =>
      targets.map((to) => ({ from, to, autoForward: true, description: "Controller DAG" }))
    );
  }

  private buildFlowMap(flows: FlowRelation[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    flows.filter((flow) => flow.autoForward).forEach((flow) => {
      const targets = map.get(flow.from) ?? [];
      if (!targets.includes(flow.to)) targets.push(flow.to);
      map.set(flow.from, targets);
    });
    return map;
  }

  // ===== 添加产出 =====
  addEntry(
    projectId: string, agentId: string, agentName: string,
    type: WorkspaceEntry["type"], title: string, content: string,
    parentId?: string,
    status: WorkspaceEntry["status"] = "SUCCESS",
    failureReason?: string
  ): WorkspaceEntry {
    this.hydrate();
    let ws = this.workspaces.get(projectId);
    if (!ws) ws = this.create(projectId, "未命名项目");

    const entry: WorkspaceEntry = {
      id: `we-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      projectId, agentId, agentName, type, title, content,
      parentId,
      consumedBy: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: this.extractTags(content),
      status,
      failureReason,
      artifacts: this.extractArtifacts(content),
    };

    ws.entries.push(entry);
    ws.updatedAt = Date.now();

    // 🔄 自动流转：通知下游 Agent
    if (entry.status !== "FAILED") {
      this.autoForward(entry);
    }
    this.persist();

    return entry;
  }

  addArtifacts(projectId: string, entryId: string, artifacts: WorkspaceArtifact[]): WorkspaceEntry | undefined {
    this.hydrate();
    const ws = this.workspaces.get(projectId);
    const entry = ws?.entries.find((item) => item.id === entryId);
    if (!ws || !entry || artifacts.length === 0) return entry;

    const existing = entry.artifacts ?? [];
    entry.artifacts = [
      ...existing,
      ...artifacts.filter((artifact) => !existing.some((item) => item.url === artifact.url)),
    ];
    entry.updatedAt = Date.now();
    ws.updatedAt = Date.now();
    this.persist();
    return entry;
  }
  // ===== 自动流转 =====
  private autoForward(entry: WorkspaceEntry) {
    const downstream = this.getFlowsForProject(entry.projectId)
      .filter(f => f.from === entry.agentId && f.autoForward)
      .map(f => f.to);

    if (downstream.length > 0) {
      // 标记已被消费
      entry.consumedBy = [...new Set([...entry.consumedBy, ...downstream])];

      // 通知聊天区
      const profiles = downstream
        .map(id => getAgentProfile(id))
        .filter(Boolean);

      if (profiles.length > 0) {
        useChatStore.getState().addMessage({
          id: `flow-${Date.now()}`,
          agentId: "controller",
          content: `🔄 ${entry.agentName} 的产出已自动流转 → ${profiles.map(p => p!.name).join("、")}`,
          type: "system",
          timestamp: new Date(),
        });
      }
    }
  }

  // ===== 获取下游可读的上下文 =====
  getContextForAgent(projectId: string, agentId: string): string {
    this.hydrate();
    const ws = this.workspaces.get(projectId);
    if (!ws) return "";

    // 查找所有上游 Agent 的产出
    const upstreamFlows = this.getFlowsForProject(projectId)
      .filter(f => f.to === agentId)
      .map(f => f.from);

    const relevantEntries = ws.entries
      .filter(e => upstreamFlows.includes(e.agentId) && e.status !== "FAILED")
      .slice(-5); // 最近 5 条

    if (relevantEntries.length === 0) return "";

    return relevantEntries
      .map(e => `[${e.agentName}] ${e.title}\n${this.summarizeContent(e.content)}`)
      .join("\n\n---\n\n");
  }

  // ===== 生成白板视图 =====
  getWhiteboard(projectId: string): WhiteboardView | null {
    this.hydrate();
    const ws = this.workspaces.get(projectId);
    if (!ws) return null;

    const agentIds = [...new Set(ws.entries.map(e => e.agentId))];
    const columns: WhiteboardColumn[] = agentIds.map(aid => {
      const profile = getAgentProfile(aid);
      return {
        agentId: aid,
        agentName: profile?.name ?? aid,
        agentColor: profile?.color ?? "#71717a",
        entries: ws.entries.filter(e => e.agentId === aid),
      };
    });

    return {
      projectId: ws.projectId,
      projectName: ws.projectName,
      columns,
    };
  }

  // ===== 辅助 =====
  private summarizeContent(content: string): string {
    const cleaned = content.replace(/\s+/g, " ").trim();
    const parts = cleaned.split(/[。！？.!?；;\n]/).map((part) => part.trim()).filter(Boolean);
    const picked = parts.filter((part) => /城市|产品|卖点|定位|章节|标题|视觉|数据|建议|结论|手册|贵阳|遵义|黔东南|安顺|铜仁/.test(part)).slice(0, 10);
    return (picked.length > 0 ? picked.join("。") : cleaned).slice(0, 900);
  }

  private extractArtifacts(content: string): WorkspaceArtifact[] {
    const artifacts: WorkspaceArtifact[] = [];
    const seen = new Set<string>();
    const markdownLinks = Array.from(content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g));

    markdownLinks.forEach((match, index) => {
      const url = String(match[2] ?? match[4] ?? "").trim();
      if (!url || seen.has(url) || !/^(https?:\/\/|\/api\/artifacts\/)/i.test(url)) return;
      seen.add(url);
      const rawName = String(match[1] ?? match[3] ?? "").trim();
      const pathname = url.split("?")[0];
      const fileName = rawName || decodeURIComponent(pathname.split("/").pop() || "artifact");
      const isImage = /\.(png|jpe?g|webp|gif|avif)$/i.test(pathname) || Boolean(match[2]);
      artifacts.push({
        id: `artifact-${Date.now()}-${index}`,
        name: fileName,
        kind: isImage ? "image" : "file",
        mimeType: isImage ? "image/*" : "application/octet-stream",
        url,
        createdAt: Date.now(),
      });
    });

    return artifacts;
  }
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    if (/设计|视觉|配色|UI/.test(content)) tags.push("设计");
    if (/文案|内容|撰写/.test(content)) tags.push("文案");
    if (/调研|分析|数据/.test(content)) tags.push("调研");
    if (/审核|检查|质量/.test(content)) tags.push("审核");
    if (/代码|开发|功能/.test(content)) tags.push("开发");
    return tags;
  }
}

export const workspaceEngine = new WorkspaceEngine();
