// ============================================
// AdapterRegistry — 统一 Adapter 工厂
// 根据配置自动创建对应类型的 Adapter
// ============================================

import { BaseAdapter, AdapterConfig } from './base';
import { MockAdapter } from './mock';
import { HermesAdapter } from './hermes';
import { OpenClawAdapter } from './openclaw';
import { DirectLLMAdapter } from './direct-llm';

// ============================================
// Agent → Adapter 映射配置
// ============================================
export interface AgentAdapterBinding {
  agentId: string;
  provider: AdapterConfig['provider'];
  providerConfigId?: string;
  apiUrl?: string;
  apiToken?: string;
  remoteAgentId?: string;
  model?: string;
}

const STORAGE_KEY = 'ah_adapter_bindings';

const CORE_HERMES_MODELS: Record<string, string> = {
  controller: 'deepseek-v4-flash',
  'research-1': 'deepseek-v4-flash',
  'content-1': 'deepseek-v4-flash',
  'design-1': 'deepseek-v4-flash',
  'dev-1': 'deepseek-v4-flash',
  'reviewer-1': 'deepseek-v4-pro',
};

// ============================================
// 默认绑定：所有 Agent 使用 MockAdapter
// ============================================
export const DEFAULT_BINDINGS: AgentAdapterBinding[] = [
  { agentId: 'controller', provider: 'hermes', model: 'deepseek-v4-flash' },
  { agentId: 'research-1', provider: 'hermes', model: 'deepseek-v4-flash' },
  { agentId: 'content-1', provider: 'hermes', model: 'deepseek-v4-flash' },
  { agentId: 'design-1', provider: 'hermes', model: 'deepseek-v4-flash' },
  { agentId: 'dev-1', provider: 'hermes', model: 'deepseek-v4-flash' },
  { agentId: 'reviewer-1', provider: 'hermes', model: 'deepseek-v4-pro' },
];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function mergeBindings(saved: AgentAdapterBinding[]) {
  const merged = [...DEFAULT_BINDINGS];
  saved.forEach((binding) => {
    const safeBinding = { ...binding, apiToken: undefined };
    const idx = merged.findIndex((item) => item.agentId === safeBinding.agentId);
    const legacyDefault = safeBinding.provider === 'mock'
      && !safeBinding.model
      && !safeBinding.apiUrl
      && !safeBinding.apiToken
      && idx >= 0;
    if (legacyDefault) return;
    if (idx >= 0) {
      const next = { ...merged[idx], ...safeBinding };
      const enforcedModel = safeBinding.provider === 'hermes' ? CORE_HERMES_MODELS[safeBinding.agentId] : undefined;
      merged[idx] = enforcedModel ? { ...next, model: enforcedModel } : next;
    } else merged.push(safeBinding);
  });
  return merged;
}

// ============================================
// Registry
// ============================================
class AdapterRegistry {
  private adapters: Map<string, BaseAdapter> = new Map();
  private bindings: AgentAdapterBinding[] = [...DEFAULT_BINDINGS];
  private hydrated = false;

  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    if (!canUseStorage()) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AgentAdapterBinding[];
      if (Array.isArray(parsed)) {
        this.bindings = mergeBindings(parsed);
        this.persist();
      }
    } catch {
      this.bindings = [...DEFAULT_BINDINGS];
    }
  }

  private persist(): void {
    if (!canUseStorage()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    } catch {
      // localStorage may be unavailable; keep runtime config in memory.
    }
  }

  /** 设置绑定配置 */
  setBindings(bindings: AgentAdapterBinding[]): void {
    this.bindings = mergeBindings(bindings);
    this.adapters.clear();
    this.persist();
  }

  getBinding(agentId: string): AgentAdapterBinding | null {
    this.hydrate();
    return this.bindings.find((binding) => binding.agentId === agentId) ?? null;
  }

  getBindings(): AgentAdapterBinding[] {
    this.hydrate();
    return [...this.bindings];
  }

  /** 获取或创建 Adapter */
  async getAdapter(agentId: string): Promise<BaseAdapter | null> {
    this.hydrate();
    // 已缓存
    if (this.adapters.has(agentId)) {
      return this.adapters.get(agentId)!;
    }

    // 查找绑定
    const binding = this.bindings.find(b => b.agentId === agentId);
    if (!binding) return null;

    const config: AdapterConfig = {
      adapterId: 'adapter-' + agentId,
      agentId,
      provider: binding.provider,
      enabled: true,
      providerConfigId: binding.providerConfigId,
      apiUrl: binding.apiUrl,
      apiToken: binding.apiToken,
      remoteAgentId: binding.remoteAgentId,
      model: binding.model,
    };

    // 创建对应类型的 Adapter
    let adapter: BaseAdapter;
    switch (binding.provider) {
      case 'mock':
        adapter = new MockAdapter(config);
        break;
      case 'hermes':
        adapter = new HermesAdapter(config);
        break;
      case 'openclaw':
        adapter = new OpenClawAdapter(config);
        break;
      case 'openai':
      case 'claude':
      case 'deepseek':
      case 'custom':
        adapter = new DirectLLMAdapter(config);
        break;
      default:
        adapter = new MockAdapter(config);
    }

    await adapter.initialize();
    this.adapters.set(agentId, adapter);
    return adapter;
  }

  /** 关闭所有 Adapter */
  async shutdownAll(): Promise<void> {
    for (const [, adapter] of Array.from(this.adapters)) {
      await adapter.shutdown();
    }
    this.adapters.clear();
  }

  /** 替换单个 Agent 的 Adapter（热切换） */
  async swapAdapter(agentId: string, binding: AgentAdapterBinding): Promise<void> {
    this.hydrate();
    const old = this.adapters.get(agentId);
    if (old) await old.shutdown();
    this.adapters.delete(agentId);

    const nextBinding = { ...binding, agentId };
    const idx = this.bindings.findIndex(b => b.agentId === agentId);
    if (idx >= 0) this.bindings[idx] = nextBinding;
    else this.bindings.push(nextBinding);

    this.persist();
    await this.getAdapter(agentId);
  }
}

// 单例
export const adapterRegistry = new AdapterRegistry();
