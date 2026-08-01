"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Film, Image as ImageIcon, KeyRound, Loader2, Plus, RefreshCw, Save, Server, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ManagedProviderConfig, ManagedProviderKind, ManagedProviderUsage } from "@/types/provider-config";

const KIND_OPTIONS: Array<{ value: ManagedProviderKind; label: string; url: string }> = [
  { value: "opencode-go", label: "OpenCode GO", url: "https://opencode.ai/zen/go/v1" },
  { value: "openai", label: "OpenAI", url: "https://api.openai.com/v1" },
  { value: "claude", label: "Claude", url: "https://api.anthropic.com/v1" },
  { value: "deepseek", label: "DeepSeek", url: "https://api.deepseek.com/v1" },
  { value: "custom", label: "OpenAI-Compatible", url: "" },
];

interface EditorState {
  id?: string;
  name: string;
  kind: ManagedProviderKind;
  usage: ManagedProviderUsage;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  models: string[];
  enabled: boolean;
  apiKeyHint?: string;
}

const USAGE_OPTIONS: Array<{ value: ManagedProviderUsage; label: string }> = [
  { value: "text", label: "文本模型" },
  { value: "image", label: "图像生成" },
  { value: "video", label: "视频生成" },
];

const EMPTY_EDITOR: EditorState = {
  name: "OpenCode GO",
  kind: "opencode-go",
  usage: "text",
  baseUrl: "https://opencode.ai/zen/go/v1",
  apiKey: "",
  defaultModel: "",
  models: [],
  enabled: true,
};

function toEditor(provider: ManagedProviderConfig): EditorState {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    usage: provider.usage,
    baseUrl: provider.baseUrl,
    apiKey: "",
    defaultModel: provider.defaultModel,
    models: provider.models,
    enabled: provider.enabled,
    apiKeyHint: provider.apiKeyHint,
  };
}

export function ProviderSettingsPanel() {
  const [providers, setProviders] = useState<ManagedProviderConfig[]>([]);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "models" | "delete" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadProviders = useCallback(async (preferredId?: string) => {
    const response = await fetch("/api/providers", { cache: "no-store" });
    const payload = await response.json() as { ok?: boolean; providers?: ManagedProviderConfig[]; error?: string };
    if (!response.ok || !payload.ok) throw new Error(payload.error ?? "读取 Provider 失败");
    const next = payload.providers ?? [];
    setProviders(next);
    const selected = next.find((item) => item.id === preferredId) ?? next.find((item) => item.id === editor.id);
    if (selected) setEditor(toEditor(selected));
    return next;
  }, [editor.id]);

  useEffect(() => {
    void loadProviders().catch((error) => setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) })).finally(() => setLoading(false));
  }, [loadProviders]);

  const selectedProvider = useMemo(() => providers.find((item) => item.id === editor.id), [editor.id, providers]);

  const selectKind = (kind: ManagedProviderKind) => {
    const preset = KIND_OPTIONS.find((item) => item.value === kind);
    setEditor((current) => ({ ...current, kind, name: current.id ? current.name : preset?.label ?? current.name, baseUrl: preset?.url ?? current.baseUrl }));
    setMessage(null);
  };

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch("/api/providers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editor) });
      const payload = await response.json() as { ok?: boolean; provider?: ManagedProviderConfig; error?: string };
      if (!response.ok || !payload.ok || !payload.provider) throw new Error(payload.error ?? "保存失败");
      await loadProviders(payload.provider.id);
      setMessage({ ok: true, text: "配置已保存" });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  };

  const discover = async () => {
    if (!editor.id) return setMessage({ ok: false, text: "请先保存 Provider" });
    setBusy("models");
    setMessage(null);
    try {
      const response = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editor.id }) });
      const payload = await response.json() as { ok?: boolean; models?: string[]; provider?: ManagedProviderConfig; error?: string };
      if (!response.ok || !payload.ok || !payload.provider) throw new Error(payload.error ?? "获取模型失败");
      await loadProviders(payload.provider.id);
      setMessage({ ok: true, text: `连接正常，已获取 ${payload.models?.length ?? 0} 个模型` });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!editor.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy("delete");
    try {
      const response = await fetch(`/api/providers?id=${encodeURIComponent(editor.id)}`, { method: "DELETE" });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "删除失败");
      const next = await loadProviders();
      setEditor(next[0] ? toEditor(next[0]) : { ...EMPTY_EDITOR });
      setConfirmDelete(false);
      setMessage({ ok: true, text: "Provider 已删除" });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="grid min-h-[480px] place-items-center text-sm text-slate-400"><Loader2 className="animate-spin" size={20} /></div>;

  return (
    <div className="grid min-h-[520px] grid-cols-[230px_minmax(0,1fr)] bg-white max-md:grid-cols-1">
      <aside className="border-r border-slate-200 p-3 max-md:border-b max-md:border-r-0">
        <div className="mb-3 flex items-center justify-between px-1"><span className="text-xs font-semibold text-slate-700">API 服务</span><button type="button" onClick={() => { setEditor({ ...EMPTY_EDITOR }); setMessage(null); setConfirmDelete(false); }} title="添加 Provider" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-violet-600"><Plus size={16} /></button></div>
        <div className="space-y-1">
          {providers.map((provider) => (
            <button key={provider.id} type="button" onClick={() => { setEditor(toEditor(provider)); setMessage(null); setConfirmDelete(false); }} className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left", editor.id === provider.id ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50")}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md", provider.usage === "image" ? "bg-rose-50 text-rose-500" : provider.usage === "video" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-500")}>{provider.usage === "image" ? <ImageIcon size={15} /> : provider.usage === "video" ? <Film size={15} /> : <Server size={15} />}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-medium">{provider.name}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-400">{provider.models.length ? `${provider.models.length} 个模型` : "未同步模型"}</span></span>
              <span className={cn("h-2 w-2 rounded-full", provider.enabled && provider.hasApiKey ? "bg-emerald-400" : "bg-slate-300")} />
            </button>
          ))}
          {!providers.length && <div className="px-2 py-8 text-center text-[11px] text-slate-400">尚未配置 API 服务</div>}
        </div>
      </aside>

      <section className="p-6 max-md:p-4">
        <div className="mx-auto max-w-[620px] space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div><h2 className="text-base font-semibold text-slate-900">{editor.id ? "编辑 API 服务" : "添加 API 服务"}</h2><p className="mt-1 text-[11px] text-slate-400">{editor.id ? selectedProvider?.apiKeyHint ? `KEY ${selectedProvider.apiKeyHint}` : "尚未填写 KEY" : "填写后可验证连接并同步模型"}</p></div>
            {editor.id && <button type="button" onClick={() => void remove()} disabled={busy !== null} className={cn("flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px]", confirmDelete ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-rose-50 hover:text-rose-600")}><Trash2 size={13} />{confirmDelete ? "确认删除" : "删除"}</button>}
          </div>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field label="名称"><input value={editor.name} onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))} className="provider-input" placeholder="例如 OpenCode GO" /></Field>
            <Field label="Provider"><select value={editor.kind} onChange={(event) => selectKind(event.target.value as ManagedProviderKind)} className="provider-input">{KIND_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          </div>
          <Field label="用途"><div className="grid grid-cols-3 gap-2">{USAGE_OPTIONS.map((usage) => <button key={usage.value} type="button" onClick={() => setEditor((current) => ({ ...current, usage: usage.value }))} className={cn("h-10 rounded-md border text-xs", editor.usage === usage.value ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>{usage.label}</button>)}</div></Field>
          <Field label="API 地址"><input value={editor.baseUrl} onChange={(event) => setEditor((current) => ({ ...current, baseUrl: event.target.value }))} className="provider-input" placeholder="https://.../v1" /></Field>
          <Field label="API KEY"><div className="relative"><KeyRound size={14} className="absolute left-3 top-3 text-slate-300" /><input type="password" value={editor.apiKey} onChange={(event) => setEditor((current) => ({ ...current, apiKey: event.target.value }))} className="provider-input pl-9" placeholder={editor.apiKeyHint ? `已配置 ${editor.apiKeyHint}，留空则不修改` : "输入 API KEY"} autoComplete="new-password" /></div></Field>
          <Field label="默认模型"><input list="provider-model-options" value={editor.defaultModel} onChange={(event) => setEditor((current) => ({ ...current, defaultModel: event.target.value }))} className="provider-input" placeholder="保存并刷新后选择模型" /><datalist id="provider-model-options">{editor.models.map((model) => <option key={model} value={model} />)}</datalist></Field>

          {editor.models.length > 0 && <div><div className="mb-2 text-[11px] font-medium text-slate-500">已同步模型</div><div className="max-h-28 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[10px] leading-6 text-slate-500">{editor.models.join(" · ")}</div></div>}
          {message && <div className={cn("flex items-center gap-2 rounded-md px-3 py-2.5 text-xs", message.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{message.ok && <Check size={14} />}{message.text}</div>}

          <div className="flex gap-2 border-t border-slate-100 pt-4 max-sm:flex-col">
            <button type="button" onClick={() => void save()} disabled={busy !== null || !editor.name.trim() || !editor.baseUrl.trim()} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-violet-600 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-40">{busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}保存配置</button>
            <button type="button" onClick={() => void discover()} disabled={busy !== null || !editor.id} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">{busy === "models" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}验证并刷新模型</button>
          </div>
        </div>
      </section>
      <style jsx global>{`.provider-input{height:40px;width:100%;border:1px solid #e2e8f0;border-radius:6px;background:#fff;padding:0 12px;font-size:12px;color:#0f172a;outline:none}.provider-input:focus{border-color:#a78bfa;box-shadow:0 0 0 3px rgba(139,92,246,.08)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-slate-500">{label}</span>{children}</label>;
}
