"use client";

import { usePathname, useRouter } from "next/navigation";
import { useUIStore, AppPage } from "@/stores/uiStore";

const LABEL_TO_PAGE: Record<string, AppPage> = {
  "智能工作流": "workspace",
  "任务中心": "tasks",
  "项目管理": "projects",
  "专家库": "experts",
  "知识库": "knowledge",
  "工具集市": "tools",
  "日志中心": "logs",
  "设置中心": "settings",
};

const PAGE_TO_PATH: Record<AppPage, string> = {
  workspace: "/workspace",
  tasks: "/tasks",
  projects: "/projects",
  experts: "/experts",
  knowledge: "/knowledge",
  tools: "/tools",
  logs: "/logs",
  settings: "/settings",
};

export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const currentPage = useUIStore((state) => state.currentPage);
  const setCurrentPage = useUIStore((state) => state.setCurrentPage);
  const routePage = (Object.entries(PAGE_TO_PATH) as [AppPage, string][])
    .find(([, path]) => pathname === path || pathname.startsWith(path + "/"))?.[0];

  return {
    go: (label: string) => {
      const page = LABEL_TO_PAGE[label];
      if (!page) return;
      setCurrentPage(page);
      router.push(PAGE_TO_PATH[page]);
    },
    isActive: (label: string) => {
      const settingsChild = pathname.startsWith("/experts") || pathname.startsWith("/tools");
      if (label === "设置中心" && settingsChild) return true;
      return (routePage ?? currentPage) === LABEL_TO_PAGE[label];
    },
  };
}
