"use client";

import { TopNav } from "./TopNav";
import { LeftSidebar } from "./LeftSidebar";
import { RightPanel } from "@/components/monitor/RightPanel";
import { useUIStore, MobileTab } from "@/stores/uiStore";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, BookOpen, FolderKanban, Home, PackageCheck, PanelLeftClose, PanelRightClose, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AgentCreateDialog, CreateAgentData } from "@/components/agents/AgentCreateDialog";
import { useAgentStore } from "@/stores/agentStore";
import { useChatStore } from "@/stores/chatStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { registerAgentProfile } from "@/lib/agent-profiles";
import { AgentChat } from "@/components/chat/AgentChat";
import { AgentSettingsPanel } from "@/components/agents/AgentSettingsPanel";
import { TaskMonitor } from "@/components/monitor/TaskMonitor";

interface AppShellProps {
  centerPanel: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanelOverride?: React.ReactNode;
  hideRightPanel?: boolean;
  onOfficeMode?: () => void;
}

function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const tabs = [
    { label: "首页", path: "/", icon: Home },
    { label: "项目", path: "/projects", icon: FolderKanban },
    { label: "知识库", path: "/knowledge", icon: BookOpen },
    { label: "智能工作流", path: "/workspace", icon: PackageCheck },
    { label: "设置", path: "/settings", icon: Settings },
  ];

  const activePath = pathname.startsWith("/experts") || pathname.startsWith("/tools") || pathname.startsWith("/tasks") || pathname.startsWith("/logs")
    ? "/settings"
    : pathname;

  return (
    <nav className="mobile-safe-bottom flex h-[58px] shrink-0 items-center border-t border-slate-200 bg-white px-1">
      {tabs.map((tab) => {
        const active = tab.path === "/" ? activePath === "/" : activePath.startsWith(tab.path);
        return (
          <button key={tab.path} type="button" onClick={() => router.push(tab.path)} className={cn("relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-violet-700" : "text-slate-400")}>
            <tab.icon size={18} strokeWidth={1.8} />
            <span>{tab.label}</span>
            {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-violet-600" />}
          </button>
        );
      })}
    </nav>
  );
}

function MobileHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const routeTitles = [
    { path: "/experts", title: "专家" },
    { path: "/tools", title: "能力设置" },
    { path: "/tasks", title: "任务记录" },
    { path: "/logs", title: "运行日志" },
    { path: "/knowledge", title: "知识库" },
    { path: "/projects", title: "项目" },
    { path: "/workspace", title: "智能工作流" },
    { path: "/settings", title: "设置" },
  ];
  const current = routeTitles.find((item) => pathname.startsWith(item.path))?.title ?? "AgentHub OS";

  return (
    <header className="mobile-safe-top flex h-[52px] shrink-0 items-center border-b border-slate-200 bg-white px-3">
      {pathname !== "/" && (
        <button type="button" onClick={() => router.back()} className="mr-1 grid h-9 w-9 place-items-center rounded-md text-slate-500 active:bg-slate-100" aria-label="返回">
          <ArrowLeft size={18} />
        </button>
      )}
      <h1 className="truncate text-[15px] font-semibold text-slate-900">{current}</h1>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={() => router.push("/logs")} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 active:bg-slate-100" aria-label="通知"><Bell size={16} /></button>
        <button type="button" onClick={() => router.push("/settings")} className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700" aria-label="设置">周</button>
      </div>
    </header>
  );
}
export function AppShell({ centerPanel, rightPanelOverride, hideRightPanel = false, onOfficeMode }: AppShellProps) {
  const pathname = usePathname();
  const {
    createDialogOpen,
    setCreateDialogOpen,
    leftCollapsed,
    rightCollapsed,
    toggleLeft,
    setRightCollapsed,
    sideChatAgentId,
    closeSideChat,
    sideSettingsAgentId,
    closeAgentSettings,
  } = useUIStore();
  const addAgent = useAgentStore((state) => state.addAgent);
  const hydrateAgentsFromStorage = useAgentStore((state) => state.hydrateFromStorage);
  const syncAgentsFromCloud = useAgentStore((state) => state.syncFromCloud);
  const hydrateChatFromStorage = useChatStore((state) => state.hydrateFromStorage);
  const syncChatFromCloud = useChatStore((state) => state.syncFromCloud);
  const hydrateWorkflowFromStorage = useWorkflowStore((state) => state.hydrateFromStorage);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  const [resizingRight, setResizingRight] = useState(false);

  useEffect(() => {
    hydrateAgentsFromStorage();
    hydrateChatFromStorage();
    hydrateWorkflowFromStorage();
    void syncAgentsFromCloud();
    void syncChatFromCloud();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void syncAgentsFromCloud();
      void syncChatFromCloud();
    };
    const interval = window.setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [hydrateAgentsFromStorage, hydrateChatFromStorage, hydrateWorkflowFromStorage, syncAgentsFromCloud, syncChatFromCloud]);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("ah_right_panel_width"));
    if (Number.isFinite(saved) && saved >= 320 && saved <= 960) {
      setRightPanelWidth(saved);
    }
  }, []);

  const startRightResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = rightPanelWidth;
    const leftWidth = leftCollapsed ? 72 : 248;
    const maxWidth = Math.max(320, Math.min(960, window.innerWidth - leftWidth - 360));
    setResizingRight(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(320, Math.min(maxWidth, startWidth + startX - moveEvent.clientX));
      setRightPanelWidth(Math.round(nextWidth));
    };
    const handleUp = (upEvent: PointerEvent) => {
      const finalWidth = Math.max(320, Math.min(maxWidth, startWidth + startX - upEvent.clientX));
      const roundedWidth = Math.round(finalWidth);
      setRightPanelWidth(roundedWidth);
      setResizingRight(false);
      window.localStorage.setItem("ah_right_panel_width", String(roundedWidth));
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleCreateAgent = (data: CreateAgentData) => {
    const agent = addAgent({
      name: data.name,
      avatar: data.avatar,
      roleLabel: data.title,
      model: data.model,
      id: data.id,
      role: data.role,
      color: data.color,
      skills: data.skills,
      tools: data.tools,
    });
    registerAgentProfile({
      id: agent.id,
      name: data.name,
      avatar: data.avatar,
      title: data.title,
      department: data.department,
      model: data.model,
      roleDescription: data.roleDescription,
      color: agent.color,
    });
  };

  const activeRightPanel = sideChatAgentId
    ? <AgentChat agentId={sideChatAgentId} onBack={closeSideChat} />
    : sideSettingsAgentId
      ? <AgentSettingsPanel agentId={sideSettingsAgentId} onBack={closeAgentSettings} />
      : (rightPanelOverride ?? <RightPanel />);

  return (
    <div className="agenthub-light-shell flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#f5f6fb] md:h-screen">
      <div className="hidden md:block"><TopNav onOfficeMode={onOfficeMode} /></div>

      <div className="hidden min-h-0 flex-1 overflow-hidden md:flex">
        <motion.aside
          animate={{ width: leftCollapsed ? 72 : 248 }}
          transition={{ duration: 0.18 }}
          className="relative shrink-0 border-r border-slate-200/80 bg-white"
        >
          <LeftSidebar collapsed={leftCollapsed} />
          {!leftCollapsed && (
            <button
              type="button"
              onClick={toggleLeft}
              className="absolute right-3 top-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"
              title="隐藏左栏"
            >
              <PanelLeftClose size={13} />
            </button>
          )}
        </motion.aside>

        {leftCollapsed && (
          <button
            type="button"
            onClick={toggleLeft}
            className="absolute left-[84px] top-[76px] z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm shadow-lg transition-colors hover:text-slate-700"
            title="展开左栏"
          >
            <PanelRightClose size={14} />
          </button>
        )}

        <main className="min-w-0 flex-1 overflow-hidden bg-[#f5f6fb]">
          {centerPanel}
        </main>

        <AnimatePresence initial={false}>
          {(!hideRightPanel || Boolean(sideChatAgentId) || Boolean(sideSettingsAgentId)) && !rightCollapsed && (
            <motion.aside
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: resizingRight ? 0 : 0.18 }}
              className="relative shrink-0 overflow-hidden border-l border-slate-200/80 bg-white"
            >
              <div
                role="separator"
                aria-label="调整右侧面板宽度"
                aria-orientation="vertical"
                onPointerDown={startRightResize}
                className="absolute inset-y-0 left-0 z-30 w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-cyan-300/35 active:bg-cyan-300/55"
              />
              {activeRightPanel}
              <button
                type="button"
                onClick={() => setRightCollapsed(true)}
                aria-label="隐藏右栏"
                className={cn(
                  "absolute top-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700",
                  sideChatAgentId || sideSettingsAgentId ? "right-3" : "left-3",
                )}
                title="隐藏右栏"
              >
                <PanelRightClose size={13} />
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        {(!hideRightPanel || Boolean(sideChatAgentId) || Boolean(sideSettingsAgentId)) && rightCollapsed && (
          <button
            type="button"
            onClick={() => setRightCollapsed(false)}
            className={cn(
              "absolute right-0 top-1/2 z-40 flex h-9 -translate-y-1/2 items-center justify-center gap-1.5 rounded-l-md border border-r-0 border-slate-200 bg-white text-slate-500 shadow-lg transition-colors hover:text-slate-700",
              pathname === "/workspace" ? "px-3" : "w-8",
            )}
            title="展开右栏"
          >
            <PanelLeftClose size={14} />
            {pathname === "/workspace" && <span className="text-[11px] font-medium">交付中心</span>}
          </button>
        )}
      </div>

      <div className="mobile-shell flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
        <MobileHeader />
        <div className="min-h-0 flex-1 overflow-hidden">
          {sideChatAgentId || sideSettingsAgentId ? activeRightPanel : centerPanel}
        </div>
        <MobileNav />
      </div>

      <AgentCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateAgent}
      />
    </div>
  );
}
