"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, Film, Image as ImageIcon, PackageOpen, X, XCircle } from "lucide-react";
import { workspaceEngine } from "@/workspace/engine";
import type { SharedWorkspace, WorkspaceArtifact, WorkspaceEntry } from "@/workspace/types";
import { downloadArtifact, downloadEntryMarkdown, downloadWorkspaceBundle } from "@/workspace/downloads";
import { WorkspaceEntryDialog } from "@/components/workspace/WorkspaceEntryDialog";

function HistoryDeliveryRow({ entry, onOpen, onOpenImage }: { entry: WorkspaceEntry; onOpen: () => void; onOpenImage: (artifact: WorkspaceArtifact) => void }) {
  const artifacts = entry.artifacts ?? [];
  const images = artifacts.filter((artifact) => artifact.kind === "image");
  const videos = artifacts.filter((artifact) => artifact.kind === "video");
  const success = entry.status === "SUCCESS";

  return (
    <article className="relative border-b border-white/[0.06] py-5 last:border-b-0">
      <div className="flex items-start gap-3.5">
        <div className={success ? "mt-0.5 text-emerald-400" : "mt-0.5 text-rose-400"}>
          {success ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[12px] text-cyan-200/65">
                <span>{entry.agentName}</span>
                <span className={success ? "text-emerald-300/65" : "text-rose-300/70"}>{success ? "已完成" : "执行失败"}</span>
              </div>
              <h3 className="mt-1 text-[15px] font-semibold leading-6 text-white/88">{entry.title}</h3>
            </div>
            <time className="shrink-0 pt-0.5 text-[11px] text-white/35">
              {new Date(entry.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>

          <div className={success ? "mt-3 rounded-md border border-white/[0.06] bg-white/[0.025] px-4 py-3.5" : "mt-3 rounded-md border border-rose-400/15 bg-rose-500/[0.035] px-4 py-3.5"}>
            <p className="line-clamp-10 whitespace-pre-wrap break-words text-[13px] leading-7 text-white/68">{entry.content}</p>
            {!success && entry.failureReason && (
              <p className="mt-3 border-t border-rose-400/10 pt-3 text-[12px] leading-6 text-rose-200/65">失败原因：{entry.failureReason}</p>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {images.map((artifact) => (
                <div key={artifact.id} className="overflow-hidden rounded-md border border-white/[0.08] bg-black/25">
                  <button type="button" onClick={() => onOpenImage(artifact)} className="block w-full bg-black/20" aria-label={"预览 " + artifact.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={artifact.url} alt={artifact.name} className="aspect-video w-full object-contain" />
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2 text-[12px] text-white/60">
                      <ImageIcon size={14} className="shrink-0 text-amber-300/70" />
                      <span className="truncate">{artifact.name}</span>
                    </div>
                    <button type="button" onClick={() => downloadArtifact(artifact)} title="下载原图" aria-label={"下载 " + artifact.name} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-cyan-300/70 hover:bg-cyan-300/10 hover:text-cyan-200"><Download size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {videos.map((artifact) => (
                <div key={artifact.id} className="overflow-hidden rounded-md border border-white/[0.08] bg-black/25">
                  <video src={artifact.url} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2 text-[12px] text-white/60"><Film size={14} className="shrink-0 text-orange-300/75" /><span className="truncate">{artifact.name}</span></div>
                    <button type="button" onClick={() => downloadArtifact(artifact)} title="下载视频" aria-label={"下载 " + artifact.name} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-cyan-300/70 hover:bg-cyan-300/10 hover:text-cyan-200"><Download size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-white/32">
              {entry.consumedBy.length > 0 ? `${entry.consumedBy.length} 个下游 Agent 已读取` : "未传递给下游 Agent"}
              {artifacts.length > 0 ? ` · ${artifacts.length} 个附件` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={onOpen} className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-white/50 hover:bg-white/[0.05] hover:text-white/75"><Eye size={13} />完整内容</button>
              <button type="button" onClick={() => downloadEntryMarkdown(entry)} className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-cyan-300/65 hover:bg-cyan-300/10 hover:text-cyan-200"><Download size={13} />下载文字</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectDeliveryHistory({ projectId }: { projectId: string }) {
  const [workspace, setWorkspace] = useState<SharedWorkspace | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<WorkspaceEntry | null>(null);
  const [selectedImage, setSelectedImage] = useState<WorkspaceArtifact | null>(null);

  useEffect(() => {
    const update = () => setWorkspace(workspaceEngine.get(projectId));
    update();
    const interval = window.setInterval(update, 1500);
    return () => window.clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    if (!selectedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedImage(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedImage]);

  const deliveries = useMemo(() => [...(workspace?.entries ?? [])].sort((a, b) => a.createdAt - b.createdAt), [workspace]);
  const successCount = deliveries.filter((entry) => entry.status === "SUCCESS").length;
  const failedCount = deliveries.filter((entry) => entry.status === "FAILED").length;

  return (
    <>
      <section className="flex h-full min-h-0 flex-col bg-[#0a0a0e]">
        <header className="shrink-0 border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-white/30">Historical Deliverables</div>
              <h2 className="mt-1 truncate text-[15px] font-semibold text-white/88">{workspace?.projectName ?? "历史交付详情"}</h2>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-white/38">
                <span>{deliveries.length} 条记录</span>
                <span className="text-emerald-300/70">{successCount} 成功</span>
                {failedCount > 0 && <span className="text-rose-300/75">{failedCount} 失败</span>}
              </div>
            </div>
            {workspace && deliveries.length > 0 && (
              <button type="button" onClick={() => void downloadWorkspaceBundle(workspace)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-white/[0.07] px-3 text-[11px] text-cyan-300/70 hover:bg-cyan-300/10 hover:text-cyan-200"><Download size={13} />下载全部</button>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {deliveries.map((entry) => <HistoryDeliveryRow key={entry.id} entry={entry} onOpen={() => setSelectedEntry(entry)} onOpenImage={setSelectedImage} />)}
          {deliveries.length === 0 && (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
              <PackageOpen size={28} className="mb-3 text-white/15" />
              <div className="text-[13px] text-white/38">这个项目还没有交付记录</div>
              <div className="mt-1 text-[11px] text-white/22">执行产出、失败原因和附件会显示在这里</div>
            </div>
          )}
        </div>
      </section>

      <WorkspaceEntryDialog entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onMouseDown={() => setSelectedImage(null)}>
          <div className="relative flex h-full w-full items-center justify-center" onMouseDown={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage.url} alt={selectedImage.name} className="max-h-full max-w-full object-contain" />
            <div className="absolute right-2 top-2 flex gap-2">
              <button type="button" onClick={() => downloadArtifact(selectedImage)} className="grid h-10 w-10 place-items-center rounded-md bg-black/60 text-white/75 hover:bg-black/80 hover:text-white" aria-label="下载原图"><Download size={18} /></button>
              <button type="button" onClick={() => setSelectedImage(null)} className="grid h-10 w-10 place-items-center rounded-md bg-black/60 text-white/75 hover:bg-black/80 hover:text-white" aria-label="关闭大图"><X size={19} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}