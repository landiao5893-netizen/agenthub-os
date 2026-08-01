"use client";

import { CheckCircle2, Circle, Clock3, PackageCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { SimplePage } from "@/components/layout/SimplePage";
import { useWorkflowStore } from "@/stores/workflowStore";
import { cn } from "@/lib/utils";

const STATUS = {
  pending: { label: "等待中", icon: Circle, tone: "text-slate-400" },
  active: { label: "处理中", icon: Clock3, tone: "text-violet-600" },
  completed: { label: "已完成", icon: CheckCircle2, tone: "text-emerald-600" },
  error: { label: "需要处理", icon: XCircle, tone: "text-rose-600" },
};

function TasksConsole() {
  const router = useRouter();
  const workflow = useWorkflowStore((state) => state.workflow);
  const nodes = workflow?.nodes ?? [];
  const progress = nodes.length ? Math.round(nodes.reduce((sum, node) => sum + node.progress, 0) / nodes.length) : 0;

  return (
    <SimplePage
      title="任务记录"
      description="查看当前项目的执行状态。"
      eyebrow="设置 / 记录"
      backHref="/settings"
      actions={workflow && <button type="button" onClick={() => router.push("/workspace")} className="flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11px] font-medium text-white hover:bg-violet-700"><PackageCheck size={14} />查看交付</button>}
    >
      <div className="mx-auto max-w-[860px]">
        {workflow ? (
          <>
            <section className="border-b border-slate-200 pb-5">
              <div className="flex items-end justify-between gap-4"><div><h2 className="text-[15px] font-semibold text-slate-900">{workflow.name}</h2><p className="mt-1 text-[11px] text-slate-400">{nodes.filter((node) => node.status === "completed").length}/{nodes.length} 项已完成</p></div><span className="text-[13px] font-medium text-slate-600">{progress}%</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600" style={{ width: `${progress}%` }} /></div>
            </section>
            <div className="divide-y divide-slate-100">
              {nodes.map((node) => {
                const meta = STATUS[node.status];
                const Icon = meta.icon;
                return <div key={node.id} className="flex items-center gap-3 py-4"><Icon size={17} className={cn("shrink-0", meta.tone)} /><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-slate-800">{node.label}</p><p className="mt-1 text-[10px] text-slate-400">{meta.label}</p></div><span className="text-[10px] text-slate-400">{node.progress}%</span></div>;
              })}
            </div>
          </>
        ) : <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center"><Clock3 size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-[13px] font-medium text-slate-700">暂无任务记录</p><p className="mt-1 text-[11px] text-slate-400">执行项目后，这里会显示进度。</p></div>}
      </div>
    </SimplePage>
  );
}

export default function TasksPage() {
  return <AppShell centerPanel={<TasksConsole />} leftPanel={<LeftSidebar />} hideRightPanel />;
}

