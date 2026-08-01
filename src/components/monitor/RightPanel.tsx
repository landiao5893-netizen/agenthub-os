"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, FileCheck2, FileText, Film, Image as ImageIcon, ShieldCheck, X, XCircle } from "lucide-react";
import { useNavigate } from "@/lib/navigation";
import { useWorkflowStore } from "@/stores/workflowStore";
import { workspaceEngine } from "@/workspace/engine";
import { SharedWorkspace, WorkspaceArtifact, WorkspaceEntry } from "@/workspace/types";
import { supervisorEngine } from "@/supervisor/engine";
import { SupervisorState } from "@/supervisor/types";
import { WorkspaceEntryDialog } from "@/components/workspace/WorkspaceEntryDialog";
import { downloadArtifact, downloadEntryMarkdown, downloadWorkspaceBundle } from "@/workspace/downloads";

function DeliveryRow({ entry, onOpen, onOpenImage }: { entry: WorkspaceEntry; onOpen: () => void; onOpenImage: (artifact: WorkspaceArtifact) => void }) {
  const artifacts = entry.artifacts ?? [];
  const images = artifacts.filter((artifact) => artifact.kind === "image");
  const videos = artifacts.filter((artifact) => artifact.kind === "video");

  return (
    <article className="border-b border-white/[0.06] py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className={entry.status === "SUCCESS" ? "mt-0.5 text-emerald-400" : "mt-0.5 text-rose-400"}>
          {entry.status === "SUCCESS" ? <FileText size={16} /> : <XCircle size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-cyan-200/78">{entry.agentName}</div>
              <h3 className="mt-1 text-[14px] font-semibold leading-6 text-white/88">{entry.title}</h3>
            </div>
            <time className="shrink-0 pt-0.5 text-[11px] text-white/35">
              {new Date(entry.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>

          <div className="mt-3 whitespace-pre-wrap break-words rounded-md border border-white/[0.06] bg-white/[0.025] px-3.5 py-3.5 text-[13px] leading-7 text-white/68">
            <p className="line-clamp-8">{entry.content}</p>
          </div>

          {images.length > 0 && (
            <div className="mt-3 space-y-2">
              {images.map((artifact) => (
                <div key={artifact.id} className="overflow-hidden rounded-md border border-white/[0.08] bg-black/30">
                  <button type="button" onClick={() => onOpenImage(artifact)} className="block w-full bg-black/20" aria-label={"预览 " + artifact.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={artifact.url} alt={artifact.name} className="aspect-square w-full object-contain" />
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-[12px] text-white/60">
                      <ImageIcon size={14} className="shrink-0 text-amber-300/70" />
                      <span className="truncate">{artifact.name}</span>
                    </div>
                    <button type="button" onClick={() => downloadArtifact(artifact)} title="下载原图" aria-label={"下载 " + artifact.name} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-cyan-300/70 hover:bg-cyan-300/10 hover:text-cyan-200">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-3 space-y-2">
              {videos.map((artifact) => (
                <div key={artifact.id} className="overflow-hidden rounded-md border border-white/[0.08] bg-black/30">
                  <video src={artifact.url} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-[12px] text-white/60"><Film size={14} className="shrink-0 text-orange-300/75" /><span className="truncate">{artifact.name}</span></div>
                    <button type="button" onClick={() => downloadArtifact(artifact)} title="下载视频" aria-label={"下载 " + artifact.name} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-cyan-300/70 hover:bg-cyan-300/10 hover:text-cyan-200"><Download size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className={entry.status === "SUCCESS" ? "text-[11px] text-emerald-300/68" : "text-[11px] text-rose-300/72"}>
              {entry.status === "SUCCESS" ? "已写入 Workspace" : "执行失败"}
              {artifacts.length > 0 ? " · " + artifacts.length + " 个附件" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={onOpen} title="查看完整成果" aria-label={"查看 " + entry.title} className="flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] text-white/48 hover:bg-white/[0.05] hover:text-white/75">
                <Eye size={13} />详情
              </button>
              <button type="button" onClick={() => downloadEntryMarkdown(entry)} title="下载文字结果" aria-label={"下载 " + entry.title} className="flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] text-cyan-300/62 hover:bg-cyan-300/10 hover:text-cyan-200">
                <Download size={13} />文字
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RightPanel() {
  const { go } = useNavigate();
  const { workflow, isRunning } = useWorkflowStore();
  const [workspace, setWorkspace] = useState<SharedWorkspace | undefined>(() => workspaceEngine.get("current"));
  const [supervisor, setSupervisor] = useState<SupervisorState>(() => supervisorEngine.getState());
  const [selectedEntry, setSelectedEntry] = useState<WorkspaceEntry | null>(null);
  const [selectedImage, setSelectedImage] = useState<WorkspaceArtifact | null>(null);

  useEffect(() => {
    const updateWorkspace = () => setWorkspace(workspaceEngine.get("current"));
    const unsubscribe = supervisorEngine.subscribe(setSupervisor);
    const interval = setInterval(updateWorkspace, 1000);
    updateWorkspace();
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedImage]);
  const deliveries = useMemo(
    () => [...(workspace?.entries ?? [])].reverse().slice(0, 30),
    [workspace],
  );
  const latestScore = useMemo(
    () => supervisor.supervisedAgents
      .map((agent) => agent.qualityScore)
      .filter((score): score is NonNullable<typeof score> => Boolean(score))
      .sort((a, b) => b.checkedAt - a.checkedAt)[0],
    [supervisor],
  );
  const completed = workflow?.nodes.filter((node) => node.status === "completed").length ?? 0;
  const total = workflow?.nodes.length ?? 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col bg-[#0b0b0f]">
        <header className="shrink-0 border-b border-white/[0.06] px-5 py-4 pl-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/32">Deliverables</div>
              <div className="mt-1 text-[16px] font-semibold text-white/90">交付中心</div>
            </div>
            <FileCheck2 size={19} className="text-cyan-300/65" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <section className="border-b border-white/[0.06] pb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] text-white/50">当前任务</span>
              <span className={isRunning ? "text-[12px] text-cyan-300" : "text-[12px] text-white/40"}>{isRunning ? "执行中" : total ? "已停止" : "待命"}</span>
            </div>
            <div className="text-[14px] font-medium leading-5 text-white/78">{workflow?.name ?? "暂无任务"}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-500" style={{ width: progress + "%" }} />
              </div>
              <span className="w-10 text-right font-mono text-[11px] text-white/50">{progress}%</span>
            </div>
          </section>

          <section className="border-b border-white/[0.06] py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] text-white/60"><ShieldCheck size={14} />质量门禁</div>
              <button type="button" onClick={() => go("日志中心")} className="text-[11px] text-cyan-300/65 hover:text-cyan-200">查看审核</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="border-r border-white/[0.06] text-center"><div className="font-mono text-[17px] text-emerald-400">{supervisor.gatesPassed}</div><div className="text-[10px] text-white/30">通过</div></div>
              <div className="border-r border-white/[0.06] text-center"><div className="font-mono text-[17px] text-rose-400">{supervisor.gatesFailed}</div><div className="text-[10px] text-white/30">未通过</div></div>
              <div className="text-center"><div className="font-mono text-[17px] text-amber-300">{supervisor.recoveryAttempts}</div><div className="text-[10px] text-white/30">恢复</div></div>
            </div>
            {latestScore && (
              <div className="mt-3 flex items-start gap-2 border-t border-white/[0.05] pt-3">
                <CheckCircle2 size={15} className={latestScore.passed ? "mt-0.5 text-emerald-400" : "mt-0.5 text-rose-400"} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-white/70">{latestScore.agentName} · {latestScore.totalScore} 分</div>
                  <p className="mt-1 line-clamp-3 text-[12px] leading-6 text-white/48">{latestScore.feedback}</p>
                </div>
              </div>
            )}
          </section>

          <section className="py-4">
            <div className="sticky top-0 z-10 -mx-1 mb-1 flex items-center justify-between bg-[#0b0b0f]/95 px-1 py-2 backdrop-blur">
              <span className="text-[13px] font-medium text-white/68">执行步骤与成果</span>
              <div className="flex items-center gap-3">
                {workspace && workspace.entries.length > 0 && (
                  <button type="button" onClick={() => void downloadWorkspaceBundle(workspace)} className="flex items-center gap-1 text-[11px] text-emerald-300/70 hover:text-emerald-200">
                    <Download size={12} />下载全部
                  </button>
                )}
                <button type="button" onClick={() => go("项目管理")} className="text-[11px] text-cyan-300/65 hover:text-cyan-200">项目看板</button>
              </div>
            </div>
            {deliveries.map((entry) => <DeliveryRow key={entry.id} entry={entry} onOpen={() => setSelectedEntry(entry)} onOpenImage={setSelectedImage} />)}
            {deliveries.length === 0 && (
              <div className="flex h-36 flex-col items-center justify-center text-center">
                <FileText size={22} className="mb-3 text-white/15" />
                <div className="text-[12px] text-white/30">暂无交付产出</div>
              </div>
            )}
          </section>
        </div>
      </aside>
      <WorkspaceEntryDialog entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onMouseDown={() => setSelectedImage(null)}>
          <div className="relative flex h-full w-full items-center justify-center" onMouseDown={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage.url} alt={selectedImage.name} className="max-h-full max-w-full object-contain" />
            <div className="absolute right-2 top-2 flex gap-2">
              <button type="button" onClick={() => downloadArtifact(selectedImage)} className="grid h-10 w-10 place-items-center rounded-md bg-black/60 text-white/75 hover:bg-black/80 hover:text-white" aria-label="下载原图" title="下载原图"><Download size={18} /></button>
              <button type="button" onClick={() => setSelectedImage(null)} className="grid h-10 w-10 place-items-center rounded-md bg-black/60 text-white/75 hover:bg-black/80 hover:text-white" aria-label="关闭大图" title="关闭"><X size={19} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}