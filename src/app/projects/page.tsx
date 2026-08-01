"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, FolderKanban, Play, Plus, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { SimplePage } from "@/components/layout/SimplePage";
import { useProjectStore, type ProjectRecord } from "@/stores/projectStore";
import { workspaceEngine } from "@/workspace/engine";
import { downloadEntryMarkdown } from "@/workspace/downloads";
import { PENDING_HOME_TASK_KEY } from "@/lib/home-task";
import { cn } from "@/lib/utils";

const STATUS = {
  planning: { label: "分析中", tone: "bg-blue-50 text-blue-700" },
  executing: { label: "执行中", tone: "bg-violet-50 text-violet-700" },
  reviewing: { label: "审核中", tone: "bg-amber-50 text-amber-700" },
  completed: { label: "已完成", tone: "bg-emerald-50 text-emerald-700" },
  success: { label: "已完成", tone: "bg-emerald-50 text-emerald-700" },
  partial_success: { label: "部分完成", tone: "bg-amber-50 text-amber-700" },
  failed: { label: "执行失败", tone: "bg-rose-50 text-rose-700" },
  waiting_recovery: { label: "等待恢复", tone: "bg-orange-50 text-orange-700" },
} as const;

type Filter = "all" | "active" | "done" | "attention";

function ProjectDetail({ project, onBack }: { project: ProjectRecord; onBack: () => void }) {
  const router = useRouter();
  const workspace = workspaceEngine.get(project.id);
  const entries = [...(workspace?.entries ?? [])].reverse();
  const successEntries = entries.filter((entry) => entry.status === "SUCCESS");
  const meta = STATUS[project.status];

  const rerun = () => {
    window.sessionStorage.setItem(PENDING_HOME_TASK_KEY, project.userRequest);
    router.push("/workspace");
  };

  return (
    <SimplePage
      title={project.name}
      description={project.userRequest}
      eyebrow="项目详情"
      actions={<button type="button" onClick={() => router.push("/workspace")} className="flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11px] font-medium text-white hover:bg-violet-700"><ArrowRight size={14} />查看交付</button>}
    >
      <div className="mx-auto max-w-[900px]">
        <button type="button" onClick={onBack} className="mb-5 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-violet-700"><ArrowLeft size={14} />返回项目列表</button>

        <section className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium", meta.tone)}>{meta.label}</span>
            <span className="text-[11px] text-slate-400">{new Date(project.updatedAt).toLocaleString("zh-CN")}</span>
            <span className="ml-auto text-[12px] font-medium text-slate-600">{project.progress}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600" style={{ width: `${project.progress}%` }} /></div>
          {project.failureReason && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] leading-5 text-rose-700">{project.failureReason}</div>}
        </section>

        <section className="py-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">项目结果</h2>
            {(project.status === "failed" || project.status === "waiting_recovery" || project.status === "partial_success") && <button type="button" onClick={rerun} className="flex items-center gap-1.5 text-[11px] text-violet-700 hover:text-violet-900"><RotateCcw size={13} />重新执行</button>}
          </div>
          {successEntries.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {successEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><FileText size={17} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-slate-800">{entry.title}</p><p className="mt-1 truncate text-[10px] text-slate-400">{entry.agentName} · {new Date(entry.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p></div>
                  <button type="button" onClick={() => downloadEntryMarkdown(entry)} className="h-8 rounded-md border border-slate-200 px-3 text-[10px] text-slate-600 hover:bg-slate-50">下载</button>
                </div>
              ))}
            </div>
          ) : <div className="rounded-lg border border-dashed border-slate-300 px-5 py-10 text-center text-[11px] text-slate-400">该项目暂时没有可下载结果。</div>}
        </section>
      </div>
    </SimplePage>
  );
}

function ProjectsConsole() {
  const router = useRouter();
  const projects = useProjectStore((state) => state.projects);
  const hydrate = useProjectStore((state) => state.hydrate);
  const selectProject = useProjectStore((state) => state.selectProject);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const visible = useMemo(() => sorted.filter((project) => {
    const textMatch = !query.trim() || `${project.name} ${project.userRequest}`.toLowerCase().includes(query.trim().toLowerCase());
    if (!textMatch) return false;
    if (filter === "active") return ["planning", "executing", "reviewing"].includes(project.status);
    if (filter === "done") return ["completed", "success"].includes(project.status);
    if (filter === "attention") return ["failed", "partial_success", "waiting_recovery"].includes(project.status);
    return true;
  }), [filter, query, sorted]);
  const detailProject = projects.find((project) => project.id === detailId);

  if (detailProject) return <ProjectDetail project={detailProject} onBack={() => setDetailId(null)} />;

  return (
    <SimplePage
      title="项目"
      description="查看正在进行和已经完成的工作。"
      eyebrow="项目空间"
      actions={<button type="button" onClick={() => router.push("/")} className="flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11px] font-medium text-white hover:bg-violet-700"><Plus size={14} />新建任务</button>}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 sm:max-w-[380px]"><Search size={15} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目" className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400" /></label>
        <div className="flex gap-1 overflow-x-auto">
          {([['all','全部'],['active','进行中'],['done','已完成'],['attention','需处理']] as Array<[Filter,string]>).map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={cn("h-9 shrink-0 rounded-md px-3 text-[11px]", filter === id ? "bg-violet-50 font-medium text-violet-700" : "text-slate-500 hover:bg-slate-100")}>{label}</button>)}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {visible.map((project) => {
            const meta = STATUS[project.status];
            return (
              <button key={project.id} type="button" onClick={() => { selectProject(project.id); setDetailId(project.id); }} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", project.status === "failed" ? "bg-rose-50 text-rose-600" : project.progress >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600")}>{project.progress >= 100 ? <CheckCircle2 size={17} /> : project.status === "failed" ? <Clock3 size={17} /> : <Play size={16} />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-slate-900">{project.name}</p><p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{project.userRequest}</p></div>
                <div className="hidden w-32 sm:block"><div className="h-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500" style={{ width: `${project.progress}%` }} /></div><p className="mt-1.5 text-right text-[9px] text-slate-400">{project.progress}%</p></div>
                <div className="hidden items-center gap-1 text-[9px] text-slate-400 md:flex"><CalendarDays size={11} />{new Date(project.updatedAt).toLocaleDateString("zh-CN")}</div>
                <span className={cn("shrink-0 rounded-full px-2 py-1 text-[9px]", meta.tone)}>{meta.label}</span>
                <ArrowRight size={15} className="shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center"><FolderKanban size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-[13px] font-medium text-slate-700">没有匹配的项目</p><p className="mt-1 text-[11px] text-slate-400">返回首页输入目标即可创建新项目。</p></div>
      )}
    </SimplePage>
  );
}

export default function ProjectsPage() {
  return <AppShell centerPanel={<ProjectsConsole />} leftPanel={<LeftSidebar />} hideRightPanel />;
}

