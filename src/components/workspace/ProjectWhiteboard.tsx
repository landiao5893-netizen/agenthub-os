"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard, Badge } from "@/components/ui/GlassCard";
import { workspaceEngine } from "@/workspace/engine";
import { WhiteboardView, WorkspaceEntry } from "@/workspace/types";
import {
  FileText, Lightbulb, GitBranch, CheckCircle2,
  ArrowRight, Download, Eye, ExternalLink,
} from "lucide-react";
import { WorkspaceEntryDialog } from "@/components/workspace/WorkspaceEntryDialog";
import { downloadEntryMarkdown, downloadWorkspaceBundle } from "@/workspace/downloads";

function EntryCard({ entry, onOpen }: { entry: WorkspaceEntry; onOpen: () => void }) {
  const iconMap = {
    task: <CheckCircle2 size={11} />,
    output: <FileText size={11} />,
    file: <ExternalLink size={11} />,
    decision: <Lightbulb size={11} />,
    comment: <FileText size={11} />,
  };

  const colorMap = {
    task: "#f59e0b", output: "#10b981", file: "#3b82f6",
    decision: "#8b5cf6", comment: "#71717a",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-2 rounded-xl border bg-white/[0.015] border-white/[0.04] mb-1.5"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color: colorMap[entry.type] }}>{iconMap[entry.type]}</span>
        <span className="text-[11px] font-medium leading-5 text-white/74">{entry.title}</span>
      </div>
      <p className="text-[10px] text-white/48 leading-5">{entry.content.slice(0, 120)}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <ArrowRight size={9} className="text-white/15" />
          <span className="text-[8px] text-white/15">
            {(entry.artifacts ?? []).length > 0 ? (entry.artifacts ?? []).length + " 个附件" : entry.consumedBy.length + " 个 Agent 已读取"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onOpen} aria-label={"查看 " + entry.title} title="查看成果" className="grid h-6 w-6 place-items-center rounded text-white/30 hover:bg-white/[0.05] hover:text-white/70"><Eye size={11} /></button>
          <button type="button" onClick={() => downloadEntryMarkdown(entry)} aria-label={"下载 " + entry.title} title="下载 Markdown" className="grid h-6 w-6 place-items-center rounded text-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"><Download size={11} /></button>
        </div>
      </div>
    </motion.div>
  );
}

function Column({ col, onOpen }: { col: WhiteboardView["columns"][0]; onOpen: (entry: WorkspaceEntry) => void }) {
  return (
    <div className="min-w-0">
      {/* 列头 */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.agentColor }} />
        <span className="text-[11px] font-medium text-white/60 truncate">{col.agentName}</span>
        <span className="text-[9px] text-white/15">{col.entries.length}</span>
      </div>
      {/* 产出列表 */}
      <div className="space-y-0">
        {col.entries.map(e => <EntryCard key={e.id} entry={e} onOpen={() => onOpen(e)} />)}
        {col.entries.length === 0 && (
          <div className="px-3 py-4 rounded-xl border border-dashed border-white/[0.04] text-[9px] text-white/10 text-center">
            等待产出...
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectWhiteboard({ projectId }: { projectId: string }) {
  const [view, setView] = useState<WhiteboardView | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WorkspaceEntry | null>(null);

  useEffect(() => {
    const update = () => setView(workspaceEngine.getWhiteboard(projectId));
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  if (!view) {
    return (
      <div className="h-full flex items-center justify-center text-white/15 text-xs">
        请输入任务开始协作
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[12px] font-semibold text-white/80">{view.projectName}</h3>
          <p className="text-[9px] text-white/25 mt-0.5">AI 团队协作白板</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => {
            const workspace = workspaceEngine.get(projectId);
            if (workspace) void downloadWorkspaceBundle(workspace);
          }} className="flex h-8 items-center gap-1.5 rounded-md border border-white/[0.07] px-3 text-[10px] text-white/55 hover:bg-white/[0.04] hover:text-white">
            <Download size={13} />下载全部
          </button>
          <Badge variant="blue">协作中</Badge>
        </div>
      </div>

      {/* 流转图 */}
      <GlassCard padding="md">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {["controller","research-1","content-1","design-1","reviewer-1"].map((aid, i, arr) => (
            <div key={aid} className="flex items-center gap-1">
              <div className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-white/30">
                {aid === "controller" ? "总控" : aid === "research-1" ? "研究" : aid === "content-1" ? "内容" : aid === "design-1" ? "设计" : "审核"}
              </div>
              {i < arr.length - 1 && <GitBranch size={9} className="text-white/[0.08] rotate-90" />}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 看板列 */}
      <div className="grid grid-cols-1 gap-3 pb-2 md:grid-cols-2 2xl:grid-cols-3">
        {view.columns.map(col => (
          <Column key={col.agentId} col={col} onOpen={setSelectedEntry} />
        ))}
      </div>
      <WorkspaceEntryDialog entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
