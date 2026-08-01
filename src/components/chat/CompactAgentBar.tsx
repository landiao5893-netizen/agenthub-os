"use client";

import { MessageCircle, Users } from "lucide-react";
import { useAgentStore } from "@/stores/agentStore";
import { useChatStore } from "@/stores/chatStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

function isBusy(status: string) {
  return !["IDLE", "DONE", "COMPLETED", "ERROR"].includes(status);
}

export function CompactAgentBar() {
  const { agents, runtimes } = useAgentStore();
  const { activeTab, openTab, setActiveTab } = useChatStore();
  const openChat = useUIStore((state) => state.openChat);

  const sorted = [...agents].sort((a, b) => {
    const activeA = isBusy(runtimes.get(a.id)?.internalStatus ?? "IDLE");
    const activeB = isBusy(runtimes.get(b.id)?.internalStatus ?? "IDLE");
    return Number(activeB) - Number(activeA);
  });

  return (
    <section className="shrink-0 border-b border-white/[0.05] bg-[#0a0a0d] py-1.5">
      <div className="mb-1 flex items-center justify-between px-3">
        <div>
          <h2 className="text-[12px] font-semibold text-white/85">AI 团队</h2>
          <p className="text-[9px] text-white/35">{agents.length} 名员工 · 点击筛选动态</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab(null)}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg border transition-colors",
            !activeTab ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" : "border-white/[0.07] text-white/40",
          )}
          aria-label="查看全部员工动态"
          title="全部员工"
        >
          <Users size={15} />
        </button>
      </div>

      <div className="mobile-agent-scroll flex gap-1.5 overflow-x-auto px-3 pb-0.5">
        {sorted.map((agent) => {
          const status = runtimes.get(agent.id)?.internalStatus ?? "IDLE";
          const active = activeTab === agent.id;
          const busy = isBusy(status);

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => {
                openTab(agent.id);
                setActiveTab(agent.id);
              }}
              className={cn(
                "relative flex w-[80px] shrink-0 flex-col items-center rounded-lg border px-1.5 py-1.5 text-center transition-colors",
                active
                  ? "border-cyan-300/25 bg-cyan-300/[0.07]"
                  : "border-white/[0.06] bg-white/[0.018] active:bg-white/[0.05]",
              )}
            >
              <span className={cn("absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full", busy ? "bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,.7)]" : status === "ERROR" ? "bg-rose-400" : "bg-emerald-400")} />
              <span className="mb-1 grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-[14px]">{agent.avatar}</span>
              <span className="w-full truncate text-[11px] font-medium text-white/82">{agent.name.split(" ")[0]}</span>
              <span className="w-full truncate text-[8px] text-white/35">{busy ? "工作中" : agent.roleLabel}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  openChat(agent.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.stopPropagation();
                    openChat(agent.id);
                  }
                }}
                className="mt-1 grid h-6 w-6 place-items-center rounded-md text-white/35 active:bg-white/[0.08] active:text-cyan-200"
                aria-label={"与 " + agent.name + " 私聊"}
                title={"与 " + agent.name + " 私聊"}
              >
                <MessageCircle size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}