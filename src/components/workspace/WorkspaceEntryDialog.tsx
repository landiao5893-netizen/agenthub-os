"use client";

import { Download, FileText, Film, Image as ImageIcon, X } from "lucide-react";
import { WorkspaceEntry } from "@/workspace/types";
import { downloadArtifact, downloadEntryMarkdown } from "@/workspace/downloads";

export function WorkspaceEntryDialog({
  entry,
  onClose,
}: {
  entry: WorkspaceEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={entry.title}
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#101014] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs text-cyan-300/70">{entry.agentName}</div>
            <h2 className="mt-1 truncate text-base font-semibold text-white/90">{entry.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭成果详情" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {(entry.artifacts ?? []).length > 0 && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(entry.artifacts ?? []).map((artifact) => (
                <div key={artifact.id} className="overflow-hidden rounded-md border border-white/[0.07] bg-black/20">
                  {artifact.kind === "image" ? (
                    <div className="aspect-square bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={artifact.url} alt={artifact.name} className="h-full w-full object-contain" />
                    </div>
                  ) : artifact.kind === "video" ? (
                    <video src={artifact.url} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                  ) : (
                    <div className="grid aspect-[2/1] place-items-center text-white/20"><FileText size={28} /></div>
                  )}
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-[10px] text-white/55">
                      {artifact.kind === "image" ? <ImageIcon size={13} /> : artifact.kind === "video" ? <Film size={13} /> : <FileText size={13} />}
                      <span className="truncate">{artifact.name}</span>
                    </div>
                    <button type="button" onClick={() => downloadArtifact(artifact)} aria-label={"下载 " + artifact.name} title="下载原文件" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-cyan-300/70 hover:bg-cyan-300/10 hover:text-cyan-200">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="whitespace-pre-wrap break-words text-[12px] leading-6 text-white/65">{entry.content}</div>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-5 py-3">
          <span className="text-[10px] text-white/25">{new Date(entry.createdAt).toLocaleString("zh-CN")}</span>
          <button type="button" onClick={() => downloadEntryMarkdown(entry)} className="flex h-8 items-center gap-2 rounded-md border border-white/[0.08] px-3 text-[11px] text-white/65 hover:bg-white/[0.05] hover:text-white">
            <Download size={14} />
            下载 Markdown
          </button>
        </footer>
      </section>
    </div>
  );
}