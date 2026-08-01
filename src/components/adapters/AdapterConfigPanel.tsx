"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { GlassCard, SectionHeader } from "@/components/ui/GlassCard";
import { adapterRegistry, type AgentAdapterBinding } from "@/adapters/registry";
import type { AdapterProvider, AdapterState } from "@/adapters/base";
import { cn } from "@/lib/utils";

const PROVIDERS: Array<{ id: AdapterProvider; label: string; desc: string }> = [
  { id: "hermes", label: "系统智能引擎", desc: "AgentHub OS 内置调度与执行" },
  { id: "openai", label: "OpenAI", desc: "每个 Agent 独立配置 OpenAI" },
  { id: "claude", label: "Claude", desc: "每个 Agent 独立配置 Anthropic" },
  { id: "deepseek", label: "DeepSeek", desc: "每个 Agent 独立配置 DeepSeek" },
  { id: "custom", label: "OpenAI-Compatible", desc: "接入兼容 Chat Completions 的服务" },
  { id: "openclaw", label: "OpenClaw", desc: "接入 OpenClaw Agent 平台" },
  { id: "mock", label: "Mock", desc: "本地模拟，不调用外部模型" },
];

const DEFAULT_MODELS: Partial<Record<AdapterProvider, string>> = {
  hermes: "deepseek-v4-flash",
  openai: "gpt-4o-mini",
  claude: "claude-4-sonnet",
  deepseek: "deepseek-chat",
};

const DEFAULT_URLS: Partial<Record<AdapterProvider, string>> = {
  hermes: "/api/intelligence",
  openai: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/messages",
  deepseek: "https://api.deepseek.com/chat/completions",
};

export function AdapterConfigPanel({ agentId }: { agentId: string }) {
  const [state, setState] = useState<AdapterState | null>(null);
  const [provider, setProvider] = useState<AdapterProvider>("hermes");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadState = useCallback(async () => {
    const binding = adapterRegistry.getBinding(agentId);
    if (binding) {
      setProvider(binding.provider);
      setApiUrl(binding.apiUrl ?? DEFAULT_URLS[binding.provider] ?? "");
      setApiToken(binding.apiToken ?? "");
      setRemoteId(binding.remoteAgentId ?? "");
      setModel(binding.model ?? DEFAULT_MODELS[binding.provider] ?? "");
    }
    try {
      const adapter = await adapterRegistry.getAdapter(agentId);
      if (adapter) setState(await adapter.getStatus());
    } catch {
      setState(null);
    }
  }, [agentId]);

  useEffect(() => { void loadState(); }, [loadState]);

  const selectProvider = (next: AdapterProvider) => {
    setProvider(next);
    setApiUrl(DEFAULT_URLS[next] ?? "");
    setModel(DEFAULT_MODELS[next] ?? "");
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const binding: AgentAdapterBinding = {
      agentId,
      provider,
      apiUrl: provider === "mock" ? undefined : apiUrl.trim() || undefined,
      apiToken: provider === "mock" || provider === "hermes" ? undefined : apiToken.trim() || undefined,
      remoteAgentId: remoteId.trim() || undefined,
      model: model.trim() || undefined,
    };
    try {
      await adapterRegistry.swapAdapter(agentId, binding);
      setSaved(true);
      await loadState();
    } finally {
      setSaving(false);
    }
  };

  const directProvider = ["openai", "claude", "deepseek", "custom"].includes(provider);

  return (
    <div className="h-full space-y-3 overflow-y-auto p-3">
      <GlassCard padding="md">
        <SectionHeader title="独立模型接入" subtitle="配置只作用于当前 Agent" />
        <div className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
          {state?.connected ? <Wifi size={18} className="text-emerald-400" /> : <WifiOff size={18} className="text-white/25" />}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-white/70">{PROVIDERS.find((item) => item.id === provider)?.label}</p>
            <p className="truncate text-[9px] text-white/30">{model || "未设置模型"}</p>
          </div>
          <button type="button" onClick={() => void loadState()} className="p-1.5 text-white/30 hover:text-white" title="刷新状态"><RefreshCw size={13} /></button>
        </div>
      </GlassCard>

      <GlassCard padding="md">
        <SectionHeader title="Provider" />
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {PROVIDERS.map((item) => <button key={item.id} type="button" onClick={() => selectProvider(item.id)} className={cn("rounded-lg border px-3 py-2 text-left transition-colors", provider === item.id ? "border-ah-accent-purple/40 bg-ah-accent-purple/10" : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12]")}><span className="block text-[11px] text-white/70">{item.label}</span><span className="mt-0.5 block text-[9px] text-white/28">{item.desc}</span></button>)}
        </div>
      </GlassCard>

      {provider !== "mock" && (
        <GlassCard padding="md">
          <SectionHeader title="连接配置" />
          <div className="space-y-2.5">
            <label className="block"><span className="mb-1 block text-[10px] text-white/35">模型 ID</span><input value={model} onChange={(event) => setModel(event.target.value)} className="input-glass text-sm" placeholder="例如 gpt-4o-mini" /></label>
            <label className="block"><span className="mb-1 block text-[10px] text-white/35">API 地址</span><input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} className="input-glass text-sm" placeholder="https://..." /></label>
            {directProvider && <label className="block"><span className="mb-1 block text-[10px] text-white/35">API Token</span><input type="password" value={apiToken} onChange={(event) => setApiToken(event.target.value)} className="input-glass text-sm" placeholder="sk-..." autoComplete="new-password" /></label>}
            {provider === "openclaw" && <label className="block"><span className="mb-1 block text-[10px] text-white/35">Remote Agent ID</span><input value={remoteId} onChange={(event) => setRemoteId(event.target.value)} className="input-glass text-sm" placeholder={agentId} /></label>}
            <p className="text-[9px] leading-relaxed text-white/25">所有请求由 AgentHub 服务端代理，浏览器不会直接连接外部模型地址。Token 仅保存在当前浏览器配置中。</p>
          </div>
        </GlassCard>
      )}

      <button type="button" onClick={() => void save()} disabled={saving || (directProvider && (!apiToken.trim() || !model.trim()))} className="btn-accent flex w-full items-center justify-center gap-2 text-[11px] disabled:pointer-events-none disabled:opacity-35">{saving ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}{saving ? "保存中" : saved ? "已保存" : "保存当前 Agent 配置"}</button>
    </div>
  );
}
