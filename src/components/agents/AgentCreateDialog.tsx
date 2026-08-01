"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Sparkles, UserRound, X } from "lucide-react";
import type { AgentRole } from "@/types";
import { EXPERT_PRESETS } from "@/lib/expert-library";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface AgentCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateAgentData) => void;
}

export interface CreateAgentData {
  id?: string;
  name: string;
  avatar: string;
  title: string;
  department: string;
  model: string;
  roleDescription: string;
  role?: AgentRole;
  color?: string;
  skills?: string[];
  tools?: string[];
}

type CreateMode = "preset" | "custom";

const EMPTY_AGENT: CreateAgentData = {
  name: "",
  avatar: "AI",
  title: "",
  department: "",
  model: "deepseek-v4-flash",
  roleDescription: "",
};

const MODEL_OPTIONS = [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-4-sonnet",
  "claude-4-opus",
];

const DEPT_OPTIONS = ["智能调度中心", "情报分析部", "内容生产部", "创意设计部", "工程研发部", "质量保障部", "运营管理部"];

export function AgentCreateDialog({ open, onClose, onCreate }: AgentCreateDialogProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<CreateMode>("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [data, setData] = useState<CreateAgentData>(EMPTY_AGENT);

  if (!open) return null;

  const choosePreset = (presetId: string) => {
    const preset = EXPERT_PRESETS.find((item) => item.config.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setData({
      id: preset.config.id,
      name: preset.config.name,
      avatar: preset.config.avatar,
      title: preset.profile.title,
      department: preset.profile.department,
      model: preset.config.model,
      roleDescription: preset.profile.roleDescription,
      role: preset.config.role,
      color: preset.config.color,
      skills: preset.config.skills,
      tools: preset.config.tools,
    });
  };

  const changeMode = (nextMode: CreateMode) => {
    setMode(nextMode);
    setSelectedPresetId(null);
    setData(EMPTY_AGENT);
  };

  const resetAndClose = () => {
    setStep(0);
    setMode("preset");
    setSelectedPresetId(null);
    setData(EMPTY_AGENT);
    onClose();
  };

  const canContinue = step === 0
    ? mode === "preset" ? Boolean(selectedPresetId) : Boolean(data.name.trim() && data.title.trim())
    : Boolean(data.department.trim() && data.model.trim());

  const createAgent = () => {
    onCreate(data);
    resetAndClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.button
          type="button"
          aria-label="关闭创建窗口"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={resetAndClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <GlassCard padding="lg" glow="purple" className="max-h-[86vh] overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-ah-accent-purple" />
                <div>
                  <h3 className="text-sm font-semibold text-ah-text-primary">创建 AI 员工</h3>
                  <p className="text-[10px] text-ah-text-muted">从专家库启用，或创建自定义角色</p>
                </div>
              </div>
              <button type="button" onClick={resetAndClose} className="p-1.5 text-ah-text-muted hover:text-white" title="关闭">
                <X size={17} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1">
              <button type="button" onClick={() => changeMode("preset")} className={cn("rounded-md px-3 py-2 text-[11px] transition-colors", mode === "preset" ? "bg-white/[0.07] text-white" : "text-white/35 hover:text-white/60")}>专家预设</button>
              <button type="button" onClick={() => changeMode("custom")} className={cn("rounded-md px-3 py-2 text-[11px] transition-colors", mode === "custom" ? "bg-white/[0.07] text-white" : "text-white/35 hover:text-white/60")}>自定义员工</button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              {["选择角色", "模型与部门", "确认"].map((label, index) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px]", index <= step ? "bg-ah-accent-purple text-white" : "border border-white/[0.07] text-white/25")}>{index + 1}</span>
                  <span className={cn("text-[10px]", index <= step ? "text-white/65" : "text-white/20")}>{label}</span>
                  {index < 2 && <span className="h-px flex-1 bg-white/[0.05]" />}
                </div>
              ))}
            </div>

            <div className="max-h-[54vh] overflow-y-auto pr-1">
              {step === 0 && mode === "preset" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {EXPERT_PRESETS.map((preset) => {
                    const selected = preset.config.id === selectedPresetId;
                    return (
                      <button key={preset.config.id} type="button" onClick={() => choosePreset(preset.config.id)} className={cn("relative flex min-h-[92px] gap-3 rounded-lg border p-3 text-left transition-colors", selected ? "border-ah-accent-purple/50 bg-ah-accent-purple/10" : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]")}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: `${preset.config.color}18`, color: preset.config.color }}>{preset.config.avatar}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-white/80">{preset.profile.title}</span>
                          <span className="mt-0.5 block truncate text-[9px] text-white/30">{preset.profile.department}</span>
                          <span className="mt-2 block truncate text-[9px] text-white/45">{preset.config.skills.slice(0, 3).join(" · ")}</span>
                        </span>
                        {selected && <Check size={14} className="absolute right-2 top-2 text-ah-accent-purple" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 0 && mode === "custom" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-[72px_1fr] gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] text-ah-text-muted">头像</label>
                      <input value={data.avatar} onChange={(event) => setData({ ...data, avatar: event.target.value.slice(0, 3) })} className="input-glass text-center text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-ah-text-muted">Agent 名称</label>
                      <input value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} placeholder="例如：Legal Advisor" className="input-glass text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-ah-text-muted">职位</label>
                    <input value={data.title} onChange={(event) => setData({ ...data, title: event.target.value })} placeholder="例如：AI 法务顾问" className="input-glass text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-ah-text-muted">角色描述</label>
                    <textarea value={data.roleDescription} onChange={(event) => setData({ ...data, roleDescription: event.target.value })} rows={3} placeholder="职责、专业边界和交付标准" className="input-glass resize-none text-sm" />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] text-ah-text-muted">所属部门</label>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {DEPT_OPTIONS.map((department) => <button key={department} type="button" onClick={() => setData({ ...data, department })} className={cn("rounded-lg border px-2.5 py-2 text-left text-[10px]", data.department === department ? "border-ah-accent-purple/40 bg-ah-accent-purple/10 text-ah-accent-purple" : "border-white/[0.05] bg-white/[0.02] text-white/35")}>{department}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-ah-text-muted">默认模型</label>
                    <input value={data.model} onChange={(event) => setData({ ...data, model: event.target.value })} placeholder="输入模型 ID" className="input-glass text-sm" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {MODEL_OPTIONS.map((model) => <button key={model} type="button" onClick={() => setData({ ...data, model })} className={cn("rounded-md border px-2 py-1 text-[9px]", data.model === model ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-300" : "border-white/[0.05] text-white/30")}>{model}</button>)}
                    </div>
                    <p className="mt-2 text-[9px] text-white/25">创建后可在 Agent 档案的“接入”页配置独立 Provider、API 地址和 Token。</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col items-center rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-6 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-2xl">{data.avatar || <UserRound size={20} />}</span>
                  <p className="text-sm font-semibold text-white/85">{data.name}</p>
                  <p className="mt-1 text-[11px] text-ah-accent-purple">{data.title}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 text-[9px] text-white/40"><span>{data.department}</span><span>·</span><span>{data.model}</span></div>
                  {data.skills?.length ? <p className="mt-4 max-w-md text-[10px] leading-relaxed text-white/35">{data.skills.slice(0, 5).join(" · ")}</p> : null}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
              <button type="button" onClick={() => setStep(Math.max(0, step - 1))} className={cn("px-2 py-1 text-[11px] text-white/35 hover:text-white/65", step === 0 && "invisible")}>上一步</button>
              {step < 2 ? (
                <button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue} className="btn-accent text-[11px] disabled:pointer-events-none disabled:opacity-35">下一步</button>
              ) : (
                <button type="button" onClick={createAgent} className="btn-accent flex items-center gap-1.5 text-[11px]"><Plus size={13} />创建员工</button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
