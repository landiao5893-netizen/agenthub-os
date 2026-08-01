"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, File, FileImage, FileSpreadsheet, FileText, Search, Upload } from "lucide-react";
import { SimplePage } from "@/components/layout/SimplePage";
import { kbEngine, seedKnowledgeBase } from "@/knowledge/engine";
import type { KBDocument } from "@/knowledge/types";
import { cn } from "@/lib/utils";

const CATEGORIES = ["全部", "项目资料", "技术文档", "品牌素材", "合同文件"];

function DocIcon({ type }: { type: KBDocument["type"] }) {
  if (type === "excel") return <FileSpreadsheet size={18} />;
  if (type === "image") return <FileImage size={18} />;
  if (type === "pdf" || type === "word") return <FileText size={18} />;
  return <File size={18} />;
}

export function KnowledgeView() {
  const [docs, setDocs] = useState<KBDocument[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("全部");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selected, setSelected] = useState<KBDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setDocs(kbEngine.getAll());

  useEffect(() => {
    let active = true;
    void seedKnowledgeBase().then(() => { if (active) refresh(); });
    refresh();
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => docs.filter((doc) => {
    if (filter !== "全部" && doc.category !== filter) return false;
    const query = search.trim().toLowerCase();
    return !query || `${doc.title} ${doc.summary} ${doc.tags.join(" ")}`.toLowerCase().includes(query);
  }), [docs, filter, search]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body: formData });
      const payload = await response.json() as { ok?: boolean; file?: { name: string; type: string; text: string }; error?: string };
      if (!response.ok || !payload.ok || !payload.file) throw new Error(payload.error ?? "文件解析失败");
      const typeByExtension: Record<string, KBDocument["type"]> = { pdf: "pdf", docx: "word", xlsx: "excel", xls: "excel", md: "markdown" };
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      await kbEngine.addDocument(payload.file.name, typeByExtension[extension] ?? "text", payload.file.text, payload.file.name);
      refresh();
      setFilter("全部");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "文件上传失败");
    } finally {
      setUploading(false);
    }
  };

  if (selected) {
    return (
      <SimplePage title={selected.title} description={`${selected.category} · ${selected.type.toUpperCase()}`} eyebrow="文件详情">
        <div className="mx-auto max-w-[860px]">
          <button type="button" onClick={() => setSelected(null)} className="mb-5 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-violet-700"><ArrowLeft size={14} />返回知识库</button>
          <div className="border-b border-slate-200 pb-5">
            <p className="text-[13px] font-medium text-slate-800">内容摘要</p>
            <p className="mt-2 text-[12px] leading-6 text-slate-500">{selected.summary || "暂无摘要"}</p>
            {selected.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{selected.tags.map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[9px] text-slate-500">{tag}</span>)}</div>}
          </div>
          <div className="py-5">
            <p className="whitespace-pre-wrap break-words text-[12px] leading-7 text-slate-700">{selected.content}</p>
          </div>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage
      title="知识库"
      description="上传项目资料，AI 团队会在执行任务时自动使用。"
      eyebrow="资料"
      actions={
        <>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json" className="hidden" onChange={handleUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11px] font-medium text-white hover:bg-violet-700 disabled:bg-slate-300"><Upload size={14} />{uploading ? "解析中" : "上传文件"}</button>
        </>
      }
    >
      {uploadError && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">{uploadError}</div>}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 sm:max-w-[380px]"><Search size={15} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索文件" className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400" /></label>
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORIES.map((category) => <button key={category} type="button" onClick={() => setFilter(category)} className={cn("h-9 shrink-0 rounded-md px-3 text-[11px]", filter === category ? "bg-violet-50 font-medium text-violet-700" : "text-slate-500 hover:bg-slate-100")}>{category}</button>)}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {visible.map((doc) => (
            <button key={doc.id} type="button" onClick={() => setSelected(doc)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><DocIcon type={doc.type} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-slate-900">{doc.title}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{doc.summary}</span></span>
              <span className="hidden rounded-md bg-slate-100 px-2 py-1 text-[9px] text-slate-500 sm:block">{doc.category}</span>
              <span className="text-[10px] text-slate-300">查看</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center"><BookOpen size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-[13px] font-medium text-slate-700">暂无文件</p><p className="mt-1 text-[11px] text-slate-400">上传 PDF、Word、Excel 或文本资料。</p></div>
      )}
    </SimplePage>
  );
}

