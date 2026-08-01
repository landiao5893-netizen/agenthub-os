"use client";

import {
  ArrowRight, BarChart3, Bell, BookOpen, Box, ClipboardList,
  CheckCircle2, ChevronDown, ChevronRight, FilePenLine, Files, FolderKanban, Home,
  ListChecks, Mail, PackageCheck, Presentation, Settings, ShieldCheck, Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectStatus } from "@/controller/types";
import { PENDING_HOME_TASK_KEY } from "@/lib/home-task";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/agentStore";
import { useProjectStore } from "@/stores/projectStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useUIStore } from "@/stores/uiStore";
import type { AgentInternalStatus } from "@/types";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { WorkflowCanvasPreview } from "@/components/workflow/SmartWorkflowCanvas";

const NAV_ITEMS = [
  { label: "首页", icon: Home, path: "/" },
  { label: "项目空间", icon: FolderKanban, path: "/projects" },
  { label: "知识库", icon: BookOpen, path: "/knowledge" },
  { label: "智能工作流", icon: PackageCheck, path: "/workspace" },
  { label: "设置", icon: Settings, path: "/settings" },
];

const SCENARIOS = [
  { title: "起草业务文档", description: "通知、制度、报告和说明文件", prompt: "根据我的要求起草一份结构完整、语言正式的业务文档", icon: FilePenLine, color: "bg-violet-100 text-violet-600" },
  { title: "审核合同风险", description: "识别条款风险并提出修改建议", prompt: "审核我提供的合同，标注风险条款并给出修改建议", icon: ShieldCheck, color: "bg-rose-100 text-rose-600" },
  { title: "分析表格数据", description: "清洗数据、发现问题并形成结论", prompt: "分析我提供的 Excel 表格，提炼关键数据并生成分析报告", icon: BarChart3, color: "bg-blue-100 text-blue-600" },
  { title: "制作汇报材料", description: "整理汇报结构、要点和表达", prompt: "根据我提供的资料制作一份清晰的工作汇报材料", icon: Presentation, color: "bg-orange-100 text-orange-600" },
  { title: "制定项目方案", description: "明确目标、计划、分工和里程碑", prompt: "为这个项目制定一份可执行的实施方案和推进计划", icon: ClipboardList, color: "bg-emerald-100 text-emerald-600" },
  { title: "整理会议纪要", description: "提炼决策、待办事项和责任人", prompt: "整理我提供的会议内容，输出会议结论和行动清单", icon: ListChecks, color: "bg-cyan-100 text-cyan-600" },
  { title: "总结文件资料", description: "提取重点、数据和待确认事项", prompt: "阅读我提供的文件，提炼核心内容并生成结构化摘要", icon: Files, color: "bg-indigo-100 text-indigo-600" },
  { title: "撰写商务函件", description: "邮件、回函、通知和沟通文案", prompt: "根据我的沟通目标撰写一份专业、得体的商务函件", icon: Mail, color: "bg-teal-100 text-teal-600" },
];

const PROJECT_STATUS: Record<ProjectStatus, string> = {
  planning: "分析中", executing: "执行中", reviewing: "审核中", completed: "已完成",
  success: "已完成", partial_success: "部分完成", failed: "执行失败", waiting_recovery: "等待恢复",
};

const AGENT_STATUS: Record<AgentInternalStatus, string> = {
  IDLE: "等待新任务", THINKING: "正在分析任务", WORKING: "正在执行任务",
  TOOL_CALL: "正在调用工具", WAITING: "等待协作结果", DONE: "已完成当前任务", ERROR: "需要处理异常",
};

function relativeTime(timestamp: number) {
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return "刚刚更新";
  if (minutes < 60) return `${minutes} 分钟前更新`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} 小时前更新` : `${Math.floor(hours / 24)} 天前更新`;
}

export function HomeDashboard() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [greeting, setGreeting] = useState("你好");
  const [mounted, setMounted] = useState(false);
  const goalInputRef = useRef<HTMLInputElement>(null);
  const [showAllScenarios, setShowAllScenarios] = useState(false);
  const agents = useAgentStore((state) => state.agents);
  const runtimes = useAgentStore((state) => state.runtimes);
  const hydrateAgents = useAgentStore((state) => state.hydrateFromStorage);
  const syncAgents = useAgentStore((state) => state.syncFromCloud);
  const projects = useProjectStore((state) => state.projects);
  const hydrateProjects = useProjectStore((state) => state.hydrate);
  const selectProject = useProjectStore((state) => state.selectProject);
  const workflow = useWorkflowStore((state) => state.workflow);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const hydrateWorkflow = useWorkflowStore((state) => state.hydrateFromStorage);
  const setMobileTab = useUIStore((state) => state.setMobileTab);
  const setRightCollapsed = useUIStore((state) => state.setRightCollapsed);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    setGreeting(hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好");
    hydrateAgents();
    hydrateProjects();
    hydrateWorkflow();
    void syncAgents();
  }, [hydrateAgents, hydrateProjects, hydrateWorkflow, syncAgents]);

  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3),
    [projects],
  );
  const activeNode = workflow?.nodes.find((node) => node.status === "active");
  const completedNodes = workflow?.nodes.filter((node) => node.status === "completed").length ?? 0;

  const navigateTo = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.label === "交付中心") {
      setMobileTab("monitor");
      setRightCollapsed(false);
    }
    router.push(item.path);
  };

  const chooseScenario = (prompt: string) => {
    setGoal(prompt);
    window.setTimeout(() => goalInputRef.current?.focus(), 0);
  };

  const openProject = (projectId: string) => {
    selectProject(projectId);
    router.push("/projects");
  };

  const submitGoal = (event?: FormEvent) => {
    event?.preventDefault();
    const task = goal.trim();
    if (!task) return;
    window.sessionStorage.setItem(PENDING_HOME_TASK_KEY, task);
    router.push("/workspace");
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f5f6fb] text-slate-950 md:grid md:h-screen md:min-h-0 md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-slate-200/80 bg-white md:block">
        <LeftSidebar />
      </aside>

      <div className="h-full min-h-0 overflow-y-auto overscroll-y-contain">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200/70 bg-[#f5f6fb]/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-xs font-black text-white">A</span><span className="text-sm font-semibold">AgentHub OS</span></div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => router.push("/logs")} aria-label="日志中心" className="relative grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-white"><Bell size={18} />{isRunning && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#f5f6fb] bg-violet-600" />}</button>
            <button type="button" onClick={() => router.push("/settings")} className="ml-1 flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-white"><span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">周</span><span className="hidden text-[12px] font-medium text-slate-700 sm:block">周总</span></button>
          </div>
        </header>

        <main className="w-full px-5 py-7 pb-24 md:px-8 md:pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-0 lg:py-8 lg:pr-0">
          <div className="min-w-0">
            <section>
              <p className="text-[12px] font-medium text-violet-600">{agents.length} 名 AI 员工{isRunning ? "正在协作" : "已就绪"}</p>
              <h1 className="mt-1.5 text-[30px] font-semibold leading-tight md:text-[36px]">{greeting}，周总</h1>
              <p className="mt-2 text-[14px] text-slate-500">告诉我你的目标，AI 团队为你完成。</p>
              <form onSubmit={submitGoal} className="mt-5 flex min-h-[68px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-[0_12px_35px_rgba(44,35,90,0.08)] focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100/70">
                <Sparkles size={20} className="ml-2 shrink-0 text-violet-500" />
                <input ref={goalInputRef} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="例如：制作一份产品手册 / 分析市场数据 / 制定推广方案" aria-label="输入你想完成的目标" className="min-w-0 flex-1 bg-transparent px-1 text-[14px] text-slate-800 outline-none placeholder:text-slate-400" />
                <button type="submit" disabled={!goal.trim()} aria-label="开始执行" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"><ArrowRight size={20} /></button>
              </form>
            </section>

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold">从业务目标开始</h2><button type="button" onClick={() => router.push("/workspace")} className="text-[12px] text-violet-600">进入智能工作流</button></div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {SCENARIOS.map((scenario, index) => (
                  <button key={scenario.title} type="button" onClick={() => chooseScenario(scenario.prompt)} className={cn("min-h-[126px] rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/60", index >= 4 && !showAllScenarios && "hidden sm:block")}>
                    <span className={cn("grid h-10 w-10 place-items-center rounded-lg", scenario.color)}><scenario.icon size={20} /></span>
                    <span className="mt-3.5 block text-[13px] font-semibold">{scenario.title}</span><span className="mt-1 block text-[11px] leading-[1.55] text-slate-400">{scenario.description}</span>
                  </button>
                ))}
              </div>
              {!showAllScenarios && <button type="button" onClick={() => setShowAllScenarios(true)} className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-500 sm:hidden">更多办公目标 <ChevronDown size={15} /></button>}
            </section>

            <WorkflowCanvasPreview onOpen={() => router.push("/workspace")} />

            <section className="mt-5 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-[14px] font-semibold">最近项目</h2><p className="mt-1 text-[11px] text-slate-400">继续查看进度和交付结果</p></div><button type="button" onClick={() => router.push("/projects")} className="flex items-center gap-1 text-[11px] text-violet-600">查看全部 <ChevronRight size={14} /></button></div>
              <div className="divide-y divide-slate-100 px-5">
                {recentProjects.map((project) => (
                  <button key={project.id} type="button" onClick={() => openProject(project.id)} className="flex w-full items-center gap-4 py-4 text-left">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><Box size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-slate-800">{project.name}</span><span className="mt-1 block text-[10px] text-slate-400">{mounted ? relativeTime(project.updatedAt) : "读取中"}</span></span>
                    <span className="hidden w-28 sm:block"><span className="mb-1.5 flex justify-between text-[10px] text-slate-400"><span>{PROJECT_STATUS[project.status]}</span><span>{project.progress}%</span></span><span className="block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${project.progress}%` }} /></span></span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                ))}
                {recentProjects.length === 0 && <div className="py-8 text-center text-[12px] text-slate-400">输入第一个目标，项目进展会显示在这里。</div>}
              </div>
            </section>
          </div>

          <aside className="mt-7 space-y-5 lg:-my-8 lg:mt-0 lg:min-h-[calc(100vh-64px)] lg:border-l lg:border-slate-200/80 lg:bg-white/50 lg:px-6 lg:py-8">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-[14px] font-semibold">AI 团队</h2><button type="button" onClick={() => router.push("/experts")} className="text-[11px] text-violet-600">全部成员</button></div>
              <div className="space-y-1">
                {agents.slice(0, 6).map((agent) => {
                  const status = runtimes.get(agent.id)?.internalStatus ?? "IDLE";
                  const detail = status === "IDLE" && activeNode?.assignedAgent === agent.id ? `正在${activeNode.label}` : AGENT_STATUS[status];
                  return <button key={agent.id} type="button" onClick={() => router.push("/workspace")} className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left hover:bg-slate-50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-base">{agent.avatar}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-slate-800">{agent.name.replace(" Agent", "")}</span><span className="block truncate text-[10px] text-slate-400">{detail}</span></span><span className={cn("h-2 w-2 rounded-full", status === "ERROR" ? "bg-rose-500" : status === "IDLE" ? "bg-slate-300" : "bg-emerald-500")} /></button>;
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] text-slate-400">当前项目</p><h2 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5">{workflow?.name ?? "团队等待新目标"}</h2></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px]", isRunning ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{isRunning ? "执行中" : "待命"}</span></div>
              {workflow?.nodes.length ? <div className="mt-5 space-y-3">{workflow.nodes.slice(0, 5).map((node) => <div key={node.id} className="flex items-center gap-3"><CheckCircle2 size={15} className={node.status === "completed" ? "text-violet-600" : node.status === "active" ? "text-blue-500" : "text-slate-300"} /><span className={cn("min-w-0 flex-1 truncate text-[11px]", node.status === "active" ? "font-medium text-slate-800" : "text-slate-500")}>{node.label}</span><span className="text-[10px] text-slate-400">{node.progress}%</span></div>)}<div className="pt-2 text-[10px] text-slate-400">已完成 {completedNodes}/{workflow.nodes.length} 个阶段</div></div> : <p className="mt-4 text-[11px] leading-5 text-slate-400">输入目标后，Controller 会在这里同步任务拆解和团队进度。</p>}
            </section>
          </aside>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white px-2 py-2 md:hidden">
          {NAV_ITEMS.slice(0, 5).map((item) => <button key={item.label} type="button" onClick={() => navigateTo(item)} className={cn("flex flex-col items-center gap-1 py-1 text-[10px]", item.path === "/" ? "text-violet-600" : "text-slate-400")}><item.icon size={18} /><span>{item.label.replace("中心", "")}</span></button>)}
        </nav>
      </div>
    </div>
  );
}
