"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  Cpu,
  Save,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { adapterRegistry } from "@/adapters/registry";
import { getAgentProfile, registerAgentProfile } from "@/lib/agent-profiles";
import { getConstitution } from "@/constitution/data";
import { kbEngine } from "@/knowledge/engine";
import { memoryStore } from "@/memory/store";
import { useAgentStore } from "@/stores/agentStore";
import { cn } from "@/lib/utils";
import type { ManagedProviderConfig } from "@/types/provider-config";

type SettingsTab = "persona" | "api" | "knowledge" | "memory";

const PROTECTED_AGENT_IDS = new Set(["controller"]);
const KB_CATEGORIES = ["项目资料", "技术文档", "品牌素材", "合同文件"];
const TABS: Array<{ id: SettingsTab; label: string; icon: typeof UserRound }> = [
  { id: "persona", label: "人设", icon: UserRound },
  { id: "api", label: "模型", icon: Cpu },
  { id: "knowledge", label: "知识", icon: BookOpen },
  { id: "memory", label: "记忆", icon: Brain },
];

interface AgentSettingsPanelProps {
  agentId: string;
  onBack: () => void;
}

export function AgentSettingsPanel({ agentId, onBack }: AgentSettingsPanelProps) {
  const agent = useAgentStore((state) => state.agents.find((item) => item.id === agentId));
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const removeAgent = useAgentStore((state) => state.removeAgent);
  const profile = getAgentProfile(agentId);
  const constitution = getConstitution(agentId);
  const initialBinding = adapterRegistry.getBinding(agentId);
  const initialAccess = kbEngine.getAccess(agentId);

  const [tab, setTab] = useState<SettingsTab>("persona");
  const [name, setName] = useState(profile?.name ?? agent?.name ?? agentId);
  const [title, setTitle] = useState(profile?.title ?? agent?.roleLabel ?? "AI 员工");
  const [department, setDepartment] = useState(profile?.department ?? "AI 团队");
  const [persona, setPersona] = useState(profile?.roleDescription ?? "");
  const [providerConfigId, setProviderConfigId] = useState(initialBinding?.providerConfigId ?? "");
  const [model, setModel] = useState(initialBinding?.model ?? profile?.model ?? agent?.model ?? "");
  const [providers, setProviders] = useState<ManagedProviderConfig[]>([]);
  const [categories, setCategories] = useState<string[]>(initialAccess?.allowedCategories ?? []);
  const [saved, setSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [, setMemoryVersion] = useState(0);

  useEffect(() => {
    const nextProfile = getAgentProfile(agentId);
    const nextBinding = adapterRegistry.getBinding(agentId);
    const nextAccess = kbEngine.getAccess(agentId);
    setTab("persona");
    setName(nextProfile?.name ?? agent?.name ?? agentId);
    setTitle(nextProfile?.title ?? agent?.roleLabel ?? "AI 员工");
    setDepartment(nextProfile?.department ?? "AI 团队");
    setPersona(nextProfile?.roleDescription ?? "");
    setProviderConfigId(nextBinding?.providerConfigId ?? "");
    setModel(nextBinding?.model ?? nextProfile?.model ?? agent?.model ?? "");
    setCategories(nextAccess?.allowedCategories ?? []);
    setSaved(false);
    setConfirmRemove(false);
  }, [agentId, agent?.model, agent?.name, agent?.roleLabel]);

  useEffect(() => {
    let active = true;
    void fetch("/api/providers", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { ok?: boolean; providers?: ManagedProviderConfig[] }) => {
        if (active && payload.ok) setProviders((payload.providers ?? []).filter((item) => item.enabled && item.usage === "text"));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const memories = [...memoryStore.getByAgent(agentId)].sort((a, b) => b.createdAt - a.createdAt);
  const stats = memoryStore.getStats(agentId);
  const removable = !PROTECTED_AGENT_IDS.has(agentId);

  if (!agent || !profile) {
    return <div className="flex h-full items-center justify-center text-[11px] text-white/25">员工资料不可用</div>;
  }

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const savePersona = () => {
    registerAgentProfile({
      id: agentId,
      name: name.trim() || profile.name,
      avatar: profile.avatar,
      title: title.trim() || profile.title,
      department: department.trim() || profile.department,
      model: model.trim() || profile.model,
      roleDescription: persona.trim() || profile.roleDescription,
      color: profile.color,
    });
    updateAgent(agentId, {
      name: name.trim() || agent.name,
      roleLabel: title.trim() || agent.roleLabel,
      model: model.trim() || agent.model,
    });
    flashSaved();
  };

  const saveApi = async () => {
    const managed = providers.find((item) => item.id === providerConfigId);
    await adapterRegistry.swapAdapter(agentId, {
      agentId,
      provider: managed ? "custom" : "hermes",
      providerConfigId: managed?.id,
      model: model.trim() || managed?.defaultModel || agent.model,
    });
    updateAgent(agentId, { model: model.trim() || managed?.defaultModel || agent.model });
    flashSaved();
  };
  const toggleCategory = (category: string) => {
    const next = categories.includes(category)
      ? categories.filter((item) => item !== category)
      : [...categories, category];
    setCategories(next);
    kbEngine.setAccess(agentId, {
      agentId,
      allowedCategories: next,
      allowedDocIds: initialAccess?.allowedDocIds ?? [],
      deniedDocIds: initialAccess?.deniedDocIds ?? [],
    });
    flashSaved();
  };

  const clearMemory = () => {
    memoryStore.clear(agentId);
    setMemoryVersion((value) => value + 1);
    flashSaved();
  };

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    if (removeAgent(agentId)) onBack();
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#0b0b0f]">
      <header className="shrink-0 border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="返回交付中心" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/70">
            <ArrowLeft size={16} />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: `${profile.color}18`, color: profile.color }}>{profile.avatar}</div>
          <div className="min-w-0 flex-1 pr-10">
            <div className="truncate text-[12px] font-semibold text-white/82">{profile.name}</div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <span className="truncate text-[9px] text-white/28">员工设置 · {profile.title}</span>
              {saved && <span className="flex shrink-0 items-center gap-1 text-[9px] text-emerald-400"><Check size={11} />已保存</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-4 border-b border-white/[0.04] px-2 py-2">
        {TABS.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn("flex h-8 items-center justify-center gap-1 rounded-md text-[10px] transition-colors", tab === item.id ? "bg-cyan-300/[0.08] text-cyan-200" : "text-white/28 hover:text-white/55")}>
            <item.icon size={12} />{item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "persona" && (
          <div className="space-y-4">
            <SectionTitle icon={UserRound} title="身份与人设" subtitle="保存后直接进入 Runtime 系统提示词" />
            <Field label="员工名称"><input value={name} onChange={(event) => setName(event.target.value)} className="settings-input" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="职位"><input value={title} onChange={(event) => setTitle(event.target.value)} className="settings-input" /></Field>
              <Field label="部门"><input value={department} onChange={(event) => setDepartment(event.target.value)} className="settings-input" /></Field>
            </div>
            <Field label="角色人设"><textarea value={persona} onChange={(event) => setPersona(event.target.value)} rows={6} className="settings-input resize-none leading-relaxed" /></Field>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[10px] text-white/35"><Shield size={12} />工作原则</div>
              <div className="space-y-1.5">
                {constitution?.workingPrinciples.slice(0, 4).map((principle) => <div key={principle} className="border-l border-white/[0.08] pl-2 text-[9px] leading-relaxed text-white/28">{principle}</div>)}
              </div>
            </div>
            <SaveButton onClick={savePersona} label="保存人设" />
          </div>
        )}

        {tab === "api" && (
          <div className="space-y-4">
            <SectionTitle icon={Cpu} title="模型分配" subtitle="API 地址和 KEY 由设置中心统一管理" />
            <Field label="API 服务">
              <select value={providerConfigId} onChange={(event) => {
                const nextId = event.target.value;
                const nextProvider = providers.find((item) => item.id === nextId);
                setProviderConfigId(nextId);
                setModel(nextProvider?.defaultModel ?? model);
              }} className="settings-input">
                <option value="">系统默认智能引擎</option>
                {providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="模型">
              <select value={model} onChange={(event) => setModel(event.target.value)} className="settings-input">
                {providerConfigId && model && !providers.find((item) => item.id === providerConfigId)?.models.includes(model) && <option value={model}>{model}</option>}
                {(providers.find((item) => item.id === providerConfigId)?.models ?? [model || agent.model]).filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            {providerConfigId && !providers.find((item) => item.id === providerConfigId)?.models.length && <p className="text-[9px] leading-relaxed text-amber-200/45">该服务尚未同步模型，请先到设置中心验证并刷新模型。</p>}
            <SaveButton onClick={() => void saveApi()} label="保存模型分配" />
          </div>
        )}

        {tab === "knowledge" && (
          <div className="space-y-4">
            <SectionTitle icon={BookOpen} title="知识库连接" subtitle={`企业知识库共 ${kbEngine.getStats().total} 份文档`} />
            <div className="space-y-2">
              {KB_CATEGORIES.map((category) => {
                const active = categories.includes("全部") || categories.includes(category);
                return (
                  <button key={category} type="button" onClick={() => toggleCategory(category)} className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors", active ? "border-cyan-300/15 bg-cyan-300/[0.05]" : "border-white/[0.05] bg-white/[0.018]")}>
                    <span className={active ? "text-[10px] text-cyan-100/70" : "text-[10px] text-white/40"}>{category}</span>
                    <span className={active ? "flex h-5 w-5 items-center justify-center rounded bg-cyan-300/15 text-cyan-300" : "h-5 w-5 rounded border border-white/[0.08]"}>{active && <Check size={12} />}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] leading-relaxed text-white/22">选中的分类会和员工记忆一起注入任务上下文。</p>
          </div>
        )}

        {tab === "memory" && (
          <div className="space-y-4">
            <SectionTitle icon={Brain} title="学习记忆" subtitle={`${stats.total} 条持久记忆`} />
            <div className="grid grid-cols-3 gap-2">
              <Stat label="经验" value={stats.experience + stats.project} />
              <Stat label="知识" value={stats.knowledge} />
              <Stat label="偏好" value={stats.preference} />
            </div>
            <div className="divide-y divide-white/[0.04] border-y border-white/[0.04]">
              {memories.slice(0, 10).map((memory) => (
                <div key={memory.id} className="py-3">
                  <div className="mb-1 flex items-center justify-between"><span className="text-[8px] uppercase text-cyan-300/45">{memory.type}</span><span className="text-[8px] text-white/15">重要度 {memory.importance}</span></div>
                  <p className="line-clamp-3 text-[9px] leading-relaxed text-white/32">{memory.content}</p>
                </div>
              ))}
              {memories.length === 0 && <div className="py-10 text-center text-[10px] text-white/18">暂无学习记忆</div>}
            </div>
            <button type="button" onClick={clearMemory} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400/10 text-[10px] text-rose-300/55 transition-colors hover:bg-rose-400/[0.05]"><Trash2 size={12} />清空学习记忆</button>
          </div>
        )}

        {removable && (
          <div className="mt-6 border-t border-white/[0.05] pt-4">
            <button type="button" onClick={handleRemove} className={cn("flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[10px] transition-colors", confirmRemove ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-300" : "border-white/[0.05] text-white/25 hover:border-rose-400/15 hover:text-rose-300/65")}>
              <Trash2 size={12} />{confirmRemove ? "再次点击确认移出团队" : "移出团队（保留设置和记忆）"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] text-white/28">{label}</span>{children}</label>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) {
  return <div className="flex items-start gap-2.5 border-b border-white/[0.05] pb-3"><Icon size={15} className="mt-0.5 text-cyan-300/55" /><div><div className="text-[11px] font-medium text-white/65">{title}</div><div className="mt-0.5 text-[8px] text-white/20">{subtitle}</div></div></div>;
}

function SaveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] text-[10px] text-cyan-200/75 transition-colors hover:bg-cyan-300/10"><Save size={12} />{label}</button>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="border-r border-white/[0.05] text-center last:border-r-0"><div className="font-mono text-[14px] text-white/65">{value}</div><div className="text-[8px] text-white/20">{label}</div></div>;
}
