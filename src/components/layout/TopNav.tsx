"use client";

import { Bell, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";

const LOG_READ_MARKER_KEY = "ah_logs_last_read_id";

interface TopNavProps {
  onOfficeMode?: () => void;
}

export function TopNav({ onOfficeMode: _onOfficeMode }: TopNavProps) {
  const router = useRouter();
  const eventLogs = useWorkflowStore((state) => state.eventLogs);
  const [lastReadLogId, setLastReadLogId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLastReadLogId(window.localStorage.getItem(LOG_READ_MARKER_KEY));
    setReady(true);
  }, []);

  const lastReadIndex = lastReadLogId
    ? eventLogs.findIndex((log) => log.id === lastReadLogId)
    : -1;
  const unreadCount = !ready
    ? 0
    : lastReadIndex >= 0
      ? eventLogs.length - lastReadIndex - 1
      : eventLogs.length;

  const openLogs = () => {
    const latestLogId = eventLogs[eventLogs.length - 1]?.id ?? null;
    setLastReadLogId(latestLogId);
    if (latestLogId) window.localStorage.setItem(LOG_READ_MARKER_KEY, latestLogId);
    else window.localStorage.removeItem(LOG_READ_MARKER_KEY);
    router.push("/logs");
  };

  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-end border-b border-slate-200/80 bg-white px-5">
      <button
        type="button"
        onClick={openLogs}
        className="relative grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
        )}
      </button>
      <button
        type="button"
        onClick={() => router.push("/settings")}
        className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Settings"
      >
        <Settings size={17} />
      </button>
      <button
        type="button"
        onClick={() => router.push("/settings")}
        className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700"
        aria-label="Account settings"
      >
        Z
      </button>
    </header>
  );
}
