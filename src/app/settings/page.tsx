"use client";

import { useState } from "react";
import { Bot, ChevronRight, FileClock, PlugZap, ScrollText, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { SimplePage } from "@/components/layout/SimplePage";
import { ProviderSettingsPanel } from "@/components/settings/ProviderSettingsPanel";
import { cn } from "@/lib/utils";

type View = "home" | "models";

const ITEMS = [
  { title: "AI 团队", description: "管理当前员工、预设专家和员工设置。", icon: UsersRound, tone: "bg-violet-50 text-violet-600", href: "/experts" },
  { title: "模型与服务", description: "统一配置 API、验证连接并同步模型列表。", icon: Bot, tone: "bg-blue-50 text-blue-600", view: "models" as const },
  { title: "插件与能力", description: "决定员工可以使用哪些工具和外部能力。", icon: PlugZap, tone: "bg-emerald-50 text-emerald-600", href: "/tools" },
];

function SettingsConsole() {
  const router = useRouter();
  const [view, setView] = useState<View>("home");

  if (view === "models") {
    return (
      <SimplePage title="模型与服务" description="统一管理 API 服务和可用模型。" eyebrow="设置" onBack={() => setView("home")}>
        <div className="mx-auto max-w-[960px]">
          <div className="min-h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-white"><ProviderSettingsPanel /></div>
        </div>
      </SimplePage>
    );
  }

  return (
    <SimplePage title="设置" description="管理 AI 团队、模型和可用能力。" eyebrow="系统">
      <div className="mx-auto max-w-[880px] space-y-7">
        <section>
          <h2 className="mb-3 text-[12px] font-semibold text-slate-700">团队与能力</h2>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {ITEMS.map((item) => (
              <button key={item.title} type="button" onClick={() => item.href ? router.push(item.href) : setView(item.view ?? "home")} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", item.tone)}><item.icon size={18} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[12px] font-medium text-slate-900">{item.title}</strong><span className="mt-1 block text-[10px] leading-5 text-slate-400">{item.description}</span></span>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[12px] font-semibold text-slate-700">记录与诊断</h2>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button type="button" onClick={() => router.push("/tasks")} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-600"><FileClock size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-[12px] font-medium text-slate-900">任务记录</strong><span className="mt-1 block text-[10px] text-slate-400">查看执行状态和需要处理的任务。</span></span><ChevronRight size={16} className="text-slate-300" /></button>
            <button type="button" onClick={() => router.push("/logs")} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><ScrollText size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-[12px] font-medium text-slate-900">运行日志</strong><span className="mt-1 block text-[10px] text-slate-400">仅在排查错误时查看详细记录。</span></span><ChevronRight size={16} className="text-slate-300" /></button>
          </div>
        </section>

        <p className="text-[10px] leading-5 text-slate-400">Controller、Runtime、Memory、Workspace 和 Supervisor 保持运行，不再作为普通用户的默认设置项展示。</p>
      </div>
    </SimplePage>
  );
}

export default function SettingsPage() {
  return <AppShell centerPanel={<SettingsConsole />} leftPanel={<LeftSidebar />} hideRightPanel />;
}

