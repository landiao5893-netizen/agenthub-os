"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Info, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { SimplePage } from "@/components/layout/SimplePage";
import { useWorkflowStore } from "@/stores/workflowStore";
import { cn } from "@/lib/utils";

type Level = "all" | "success" | "warn" | "error" | "info";

const LEVEL_META = {
  info: { label: "信息", icon: Info, tone: "text-blue-600 bg-blue-50" },
  warn: { label: "提醒", icon: AlertCircle, tone: "text-amber-600 bg-amber-50" },
  error: { label: "错误", icon: AlertCircle, tone: "text-rose-600 bg-rose-50" },
  success: { label: "完成", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
};

function LogsConsole() {
  const logs = useWorkflowStore((state) => state.eventLogs);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const visible = useMemo(() => [...logs].reverse().filter((log) => {
    if (level !== "all" && log.level !== level) return false;
    const text = query.trim().toLowerCase();
    return !text || `${log.event} ${log.detail}`.toLowerCase().includes(text);
  }), [level, logs, query]);

  return (
    <SimplePage title="运行日志" description="仅在任务异常或需要追踪执行记录时查看。" eyebrow="设置 / 诊断" backHref="/settings">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 sm:max-w-[380px]"><Search size={15} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索日志" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-400" /></label>
          <div className="flex gap-1 overflow-x-auto">{([['all','全部'],['error','错误'],['warn','提醒'],['success','完成'],['info','信息']] as Array<[Level,string]>).map(([id,label]) => <button key={id} type="button" onClick={() => setLevel(id)} className={cn("h-9 shrink-0 rounded-md px-3 text-[11px]", level === id ? "bg-violet-50 font-medium text-violet-700" : "text-slate-500 hover:bg-slate-100")}>{label}</button>)}</div>
        </div>
        {visible.length > 0 ? (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {visible.map((log) => {
              const meta = LEVEL_META[log.level];
              const Icon = meta.icon;
              const expanded = expandedId === log.id;
              return <button key={log.id} type="button" onClick={() => setExpandedId(expanded ? null : log.id)} className="block w-full px-4 py-3.5 text-left hover:bg-slate-50"><div className="flex items-center gap-3"><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", meta.tone)}><Icon size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-slate-800">{log.event}</p><p className="mt-1 text-[9px] text-slate-400">{log.timestamp.toLocaleString("zh-CN")} · {meta.label}</p></div>{expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}</div>{expanded && <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-[11px] leading-6 text-slate-600">{log.detail}</p>}</button>;
            })}
          </div>
        ) : <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center text-[11px] text-slate-400">暂无匹配的运行记录。</div>}
      </div>
    </SimplePage>
  );
}

export default function LogsPage() {
  return <AppShell centerPanel={<LogsConsole />} leftPanel={<LeftSidebar />} hideRightPanel />;
}

