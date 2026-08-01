"use client";

import { BookOpen, FolderKanban, Home, PackageCheck, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LeftSidebarProps {
  collapsed?: boolean;
}

const NAV_ITEMS = [
  { icon: Home, label: "首页", path: "/" },
  { icon: FolderKanban, label: "项目", path: "/projects" },
  { icon: BookOpen, label: "知识库", path: "/knowledge" },
  { icon: PackageCheck, label: "智能工作流", path: "/workspace" },
  { icon: Settings, label: "设置", path: "/settings" },
];

function isSelected(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  if (path === "/settings") return pathname.startsWith("/settings") || pathname.startsWith("/experts") || pathname.startsWith("/tools") || pathname.startsWith("/tasks") || pathname.startsWith("/logs");
  return pathname === path || pathname.startsWith(path + "/");
}

export function LeftSidebar({ collapsed = false }: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 px-4", collapsed && "justify-center px-2")}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-[12px] font-bold text-white">AH</div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold text-slate-950">AgentHub OS</div>
            <div className="mt-0.5 text-[9px] text-slate-400">AI 工作空间</div>
          </div>
        )}
      </div>

      <nav className={cn("mt-3 shrink-0 space-y-1 px-3", collapsed && "px-2")}>
        {NAV_ITEMS.map((item) => {
          const active = isSelected(pathname, item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              title={item.label}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-[12px] font-medium transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <item.icon size={17} strokeWidth={1.8} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-3">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className={cn("flex w-full items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-left", collapsed && "justify-center border-0 bg-transparent p-1")}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">周</span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-slate-800">周总</span>
              <span className="mt-0.5 block text-[9px] text-slate-400">个人空间</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

