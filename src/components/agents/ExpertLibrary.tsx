"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Plus, RotateCcw, Search, Settings2, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { SimplePage } from "@/components/layout/SimplePage";
import { EXPERT_PRESETS } from "@/lib/expert-library";
import { useAgentStore } from "@/stores/agentStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

type View = "team" | "add";

export function ExpertLibrary() {
  const [view, setView] = useState<View>("team");
  const [query, setQuery] = useState("");
  const agents = useAgentStore((state) => state.agents);
  const archivedAgents = useAgentStore((state) => state.archivedAgents);
  const addAgent = useAgentStore((state) => state.addAgent);
  const removeAgent = useAgentStore((state) => state.removeAgent);
  const restoreAgent = useAgentStore((state) => state.restoreAgent);
  const selectAgent = useAgentStore((state) => state.selectAgent);
  const { openChat, openSideChat, openAgentSettings, setCreateDialogOpen } = useUIStore();
  const activeIds = useMemo(() => new Set(agents.map((agent) => agent.id)), [agents]);
  const normalized = query.trim().toLowerCase();
  const availableExperts = useMemo(() => EXPERT_PRESETS.filter((expert) => !activeIds.has(expert.config.id) && (!normalized || [expert.profile.title, expert.profile.department, expert.profile.roleDescription, ...expert.config.skills].join(" ").toLowerCase().includes(normalized))), [activeIds, normalized]);
  const visibleAgents = useMemo(() => agents.filter((agent) => !normalized || [agent.name, agent.roleLabel, ...agent.skills].join(" ").toLowerCase().includes(normalized)), [agents, normalized]);

  const openChatFor = (agentId: string) => {
    selectAgent(agentId);
    if (window.matchMedia("(max-width: 767px)").matches) openChat(agentId);
    else openSideChat(agentId);
  };

  const enableExpert = (expertId: string) => {
    const expert = EXPERT_PRESETS.find((item) => item.config.id === expertId);
    if (!expert) return;
    addAgent({ ...expert.config, id: expert.config.id, role: expert.config.role, color: expert.config.color, skills: expert.config.skills, tools: expert.config.tools });
    setView("team");
  };

  return (
    <SimplePage
      title="AI 团队"
      description="管理当前员工，或从专家库添加新成员。"
      eyebrow="设置"
      backHref="/settings"
      actions={<button type="button" onClick={() => setCreateDialogOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11px] font-medium text-white hover:bg-violet-700"><Plus size={14} />自定义员工</button>}
    >
      <div className="mx-auto max-w-[920px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-md bg-slate-100 p-1"><button type="button" onClick={() => setView("team")} className={cn("h-8 rounded px-3 text-[11px]", view === "team" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500")}>当前团队 {agents.length}</button><button type="button" onClick={() => setView("add")} className={cn("h-8 rounded px-3 text-[11px]", view === "add" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500")}>添加专家</button></div>
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 sm:w-[320px]"><Search size={15} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "team" ? "搜索当前员工" : "搜索职位或技能"} className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-400" /></label>
        </div>

        {view === "team" ? (
          <>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {visibleAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 px-4 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg" style={{ color: agent.color, backgroundColor: `${agent.color}12` }}>{agent.avatar}</span>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-[12px] font-medium text-slate-900">{agent.name}</h2>{agent.role === "controller" && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[8px] text-violet-700">主控</span>}</div><p className="mt-1 truncate text-[10px] text-slate-400">{agent.roleLabel} · {agent.model}</p></div>
                  <button type="button" onClick={() => openChatFor(agent.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-violet-700" aria-label={`和 ${agent.name} 沟通`}><MessageCircle size={15} /></button>
                  <button type="button" onClick={() => openAgentSettings(agent.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-violet-700" aria-label={`设置 ${agent.name}`}><Settings2 size={15} /></button>
                  {agent.role !== "controller" && <button type="button" onClick={() => removeAgent(agent.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600" aria-label={`移出 ${agent.name}`}><UserMinus size={15} /></button>}
                </div>
              ))}
              {visibleAgents.length === 0 && <div className="px-6 py-14 text-center text-[11px] text-slate-400">没有匹配的员工。</div>}
            </div>

            {archivedAgents.length > 0 && !normalized && (
              <section className="mt-7"><div className="mb-3 flex items-center gap-2"><UsersRound size={15} className="text-slate-400" /><h2 className="text-[12px] font-semibold text-slate-700">已移出员工</h2></div><div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">{archivedAgents.map((agent) => <div key={agent.id} className="flex items-center gap-3 px-4 py-3.5"><span className="grid h-9 w-9 place-items-center rounded-lg text-lg" style={{ color: agent.color, backgroundColor: `${agent.color}12` }}>{agent.avatar}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-slate-800">{agent.name}</p><p className="mt-1 text-[9px] text-slate-400">设置和记忆已保留</p></div><button type="button" onClick={() => restoreAgent(agent.id)} className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-[10px] text-emerald-700"><RotateCcw size={12} />恢复</button></div>)}</div></section>
            )}
          </>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {availableExperts.map((expert) => <div key={expert.config.id} className="flex items-center gap-3 px-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg" style={{ color: expert.config.color, backgroundColor: `${expert.config.color}12` }}>{expert.config.avatar}</span><div className="min-w-0 flex-1"><h2 className="truncate text-[12px] font-medium text-slate-900">{expert.profile.title}</h2><p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{expert.profile.roleDescription}</p></div><button type="button" onClick={() => enableExpert(expert.config.id)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 text-[10px] text-violet-700 hover:bg-violet-100"><UserPlus size={12} />添加</button></div>)}
            {availableExperts.length === 0 && <div className="px-6 py-14 text-center text-[11px] text-slate-400">没有可添加的匹配专家。</div>}
          </div>
        )}
      </div>
    </SimplePage>
  );
}

