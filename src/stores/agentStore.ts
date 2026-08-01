import { create } from 'zustand';
import { AgentRuntime, AgentConfig, AgentInternalStatus, AgentRole } from '@/types';
import { MOCK_AGENTS, MOCK_AGENT_RUNTIMES } from '@/lib/mock-data';
import { CORE_EXPERT_IDS } from '@/lib/expert-library';

const AGENTS_STORAGE_KEY = 'ah_agents';
const ARCHIVED_AGENTS_STORAGE_KEY = 'ah_archived_agents';
const ACTIVE_EXPERTS_STORAGE_KEY = 'ah_active_experts';

const CORE_DEFAULT_MODELS: Record<string, string> = {
  controller: 'deepseek-v4-flash',
  'research-1': 'deepseek-v4-flash',
  'content-1': 'deepseek-v4-flash',
  'design-1': 'deepseek-v4-flash',
  'dev-1': 'deepseek-v4-flash',
  'reviewer-1': 'deepseek-v4-pro',
};

interface AgentStore {
  agents: AgentConfig[];
  archivedAgents: AgentConfig[];
  runtimes: Map<string, AgentRuntime>;
  selectedAgentId: string | null;
  hydrateFromStorage: () => void;
  syncFromCloud: () => Promise<void>;

  addAgent: (agent: Omit<AgentConfig, 'id' | 'role' | 'skills' | 'tools' | 'color'> & { id?: string; role?: AgentRole; color?: string; skills?: string[]; tools?: string[] }) => AgentConfig;
  updateAgent: (agentId: string, patch: Partial<Pick<AgentConfig, 'name' | 'roleLabel' | 'model' | 'skills' | 'tools' | 'avatar' | 'color'>>) => void;
  removeAgent: (agentId: string) => boolean;
  restoreAgent: (agentId: string) => AgentConfig | null;
  selectAgent: (id: string | null) => void;
  updateAgentStatus: (agentId: string, status: AgentInternalStatus) => void;
  updateAgentProgress: (agentId: string, progress: number) => void;
  getAgentRuntime: (agentId: string) => AgentRuntime | undefined;
  getAgentConfig: (agentId: string) => AgentConfig | undefined;
  getActiveAgents: () => AgentRuntime[];
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}



type CloudAgentState = {
  revision: number;
  agents: AgentConfig[];
  archivedAgents: AgentConfig[];
};

let cloudRevision = 0;
let cloudReady = false;
let cloudSaveTimer: number | null = null;

function normalizeCloudAgents(agents: AgentConfig[]): AgentConfig[] {
  return agents
    .filter((agent) => agent?.id && agent.name)
    .map((agent) => CORE_DEFAULT_MODELS[agent.id] ? { ...agent, model: CORE_DEFAULT_MODELS[agent.id] } : agent);
}

function persistActiveExperts(agents: AgentConfig[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      ACTIVE_EXPERTS_STORAGE_KEY,
      JSON.stringify(agents.filter((agent) => CORE_EXPERT_IDS.has(agent.id)).map((agent) => agent.id)),
    );
  } catch {
    // Cloud state remains authoritative.
  }
}

async function saveCloudSnapshot(agents: AgentConfig[], archivedAgents: AgentConfig[], retry = true): Promise<void> {
  if (!cloudReady) return;
  try {
    const response = await fetch('/api/agents/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: cloudRevision, agents, archivedAgents }),
    });
    const payload = await response.json();
    if (response.status === 409 && retry) {
      cloudRevision = Number(payload?.state?.revision ?? cloudRevision);
      await saveCloudSnapshot(agents, archivedAgents, false);
      return;
    }
    if (response.ok && payload?.state) cloudRevision = Number(payload.state.revision ?? cloudRevision);
  } catch {
    // Local state remains available and will be retried by the next mutation.
  }
}

function scheduleCloudPersist(agents: AgentConfig[], archivedAgents: AgentConfig[]) {
  if (!cloudReady || typeof window === 'undefined') return;
  if (cloudSaveTimer) window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    cloudSaveTimer = null;
    void saveCloudSnapshot(agents, archivedAgents);
  }, 250);
}

function buildRuntimeMap(runtimes: AgentRuntime[]): Map<string, AgentRuntime> {
  const map = new Map<string, AgentRuntime>();
  runtimes.forEach((r) => map.set(r.agentId, r));
  return map;
}

function buildIdleRuntime(agentId: string): AgentRuntime {
  return {
    agentId,
    internalStatus: 'IDLE',
    currentTask: null,
    progress: 0,
    lastActive: new Date(),
    messages: 0,
  };
}

function restoreAgents(): AgentConfig[] {
  if (!canUseStorage()) return MOCK_AGENTS;
  try {
    const raw = window.localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) return MOCK_AGENTS;
    const parsed = JSON.parse(raw) as AgentConfig[];
    if (!Array.isArray(parsed)) return MOCK_AGENTS;
    const activeExperts = new Set<string>(JSON.parse(window.localStorage.getItem(ACTIVE_EXPERTS_STORAGE_KEY) ?? '[]'));
    const archived = JSON.parse(window.localStorage.getItem(ARCHIVED_AGENTS_STORAGE_KEY) ?? '[]') as AgentConfig[];
    const archivedIds = new Set(Array.isArray(archived) ? archived.map((agent) => agent.id) : []);
    const merged = MOCK_AGENTS.filter((agent) => agent.id === 'controller' || !archivedIds.has(agent.id));
    parsed.forEach((agent) => {
      if (!agent?.id || !agent.name) return;
      if (CORE_EXPERT_IDS.has(agent.id) && !activeExperts.has(agent.id)) return;
      const idx = merged.findIndex((item) => item.id === agent.id);
      if (idx >= 0) {
        const coreModel = CORE_DEFAULT_MODELS[agent.id];
        const migratedAgent = coreModel ? { ...agent, model: coreModel } : agent;
        merged[idx] = { ...merged[idx], ...migratedAgent };
      } else {
        merged.push(agent);
      }
    });
    return merged;
  } catch {
    return MOCK_AGENTS;
  }
}

function persistAgents(agents: AgentConfig[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch {
    // localStorage can be unavailable; runtime still works for this session.
  }
}

function restoreArchivedAgents(): AgentConfig[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ARCHIVED_AGENTS_STORAGE_KEY) ?? '[]') as AgentConfig[];
    return Array.isArray(parsed) ? parsed.filter((agent) => agent?.id && agent.name) : [];
  } catch {
    return [];
  }
}

function persistArchivedAgents(agents: AgentConfig[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(ARCHIVED_AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch {
    // Keep archived employees available for the current session.
  }
}

function setActiveExpert(agentId: string, activeState: boolean) {
  if (!canUseStorage() || !CORE_EXPERT_IDS.has(agentId)) return;
  try {
    const active = new Set<string>(JSON.parse(window.localStorage.getItem(ACTIVE_EXPERTS_STORAGE_KEY) ?? '[]'));
    if (activeState) active.add(agentId);
    else active.delete(agentId);
    window.localStorage.setItem(ACTIVE_EXPERTS_STORAGE_KEY, JSON.stringify(Array.from(active)));
  } catch {
    // Keep the team state available for the current session.
  }
}

function restoreRuntimes(agents: AgentConfig[]) {
  const runtimes = buildRuntimeMap(MOCK_AGENT_RUNTIMES);
  agents.forEach((agent) => {
    if (!runtimes.has(agent.id)) runtimes.set(agent.id, buildIdleRuntime(agent.id));
  });
  return runtimes;
}

const initialAgents = MOCK_AGENTS;
const initialArchivedAgents: AgentConfig[] = [];

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: initialAgents,
  archivedAgents: initialArchivedAgents,
  runtimes: restoreRuntimes(initialAgents),
  selectedAgentId: null,

  hydrateFromStorage: () => {
    const agents = restoreAgents();
    const archivedAgents = restoreArchivedAgents();
    set({ agents, archivedAgents, runtimes: restoreRuntimes(agents) });
  },

  syncFromCloud: async () => {
    try {
      const response = await fetch('/api/agents/state', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.initialized) {
        cloudReady = true;
        await saveCloudSnapshot(get().agents, get().archivedAgents);
        return;
      }
      const remote = payload.state as CloudAgentState;
      const revision = Number(remote?.revision ?? 0);
      if (cloudReady && revision <= cloudRevision) return;
      const agents = normalizeCloudAgents(Array.isArray(remote?.agents) ? remote.agents : []);
      if (!agents.some((agent) => agent.id === 'controller')) return;
      const activeIds = new Set(agents.map((agent) => agent.id));
      const archivedAgents = normalizeCloudAgents(Array.isArray(remote?.archivedAgents) ? remote.archivedAgents : [])
        .filter((agent) => !activeIds.has(agent.id));
      cloudRevision = revision;
      cloudReady = true;
      persistAgents(agents);
      persistArchivedAgents(archivedAgents);
      persistActiveExperts(agents);
      const currentRuntimes = get().runtimes;
      const runtimes = new Map<string, AgentRuntime>();
      agents.forEach((agent) => runtimes.set(agent.id, currentRuntimes.get(agent.id) ?? buildIdleRuntime(agent.id)));
      set((state) => ({
        agents, archivedAgents, runtimes,
        selectedAgentId: state.selectedAgentId && activeIds.has(state.selectedAgentId) ? state.selectedAgentId : null,
      }));
    } catch {
      // Keep local state when cloud synchronization is unavailable.
    }
  },

  addAgent: (input) => {
    const id = input.id ?? 'agent-' + Date.now();
    const role = input.role ?? 'analyst';
    const agent: AgentConfig = {
      id,
      name: input.name,
      role,
      roleLabel: input.roleLabel,
      model: input.model,
      skills: input.skills ?? ['任务执行', '协作沟通'],
      tools: input.tools ?? ['text_generation', 'knowledge_retrieval'],
      avatar: input.avatar,
      color: input.color ?? '#8b5cf6',
    };
    const runtime = buildIdleRuntime(id);
    setActiveExpert(id, true);

    set((state) => {
      if (state.agents.some((a) => a.id === id)) return state;
      const runtimes = new Map(state.runtimes);
      runtimes.set(id, runtime);
      const agents = [...state.agents, agent];
      const archivedAgents = state.archivedAgents.filter((item) => item.id !== id);
      persistAgents(agents);
      persistArchivedAgents(archivedAgents);
      scheduleCloudPersist(agents, archivedAgents);
      return { agents, archivedAgents, runtimes };
    });

    return agent;
  },

  updateAgent: (agentId, patch) => set((state) => {
    const agents = state.agents.map((agent) => agent.id === agentId ? { ...agent, ...patch } : agent);
    persistAgents(agents);
    scheduleCloudPersist(agents, state.archivedAgents);
    return { agents };
  }),

  removeAgent: (agentId) => {
    const removedAgent = get().agents.find((agent) => agent.id === agentId);
    if (agentId === 'controller' || !removedAgent) return false;
    setActiveExpert(agentId, false);
    set((state) => {
      const agents = state.agents.filter((agent) => agent.id !== agentId);
      const archivedAgents = [...state.archivedAgents.filter((agent) => agent.id !== agentId), removedAgent];
      const runtimes = new Map(state.runtimes);
      runtimes.delete(agentId);
      persistAgents(agents);
      persistArchivedAgents(archivedAgents);
      scheduleCloudPersist(agents, archivedAgents);
      return { agents, archivedAgents, runtimes, selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId };
    });
    return true;
  },

  restoreAgent: (agentId) => {
    const archivedAgent = get().archivedAgents.find((agent) => agent.id === agentId);
    if (!archivedAgent) return null;
    setActiveExpert(agentId, true);
    set((state) => {
      if (state.agents.some((agent) => agent.id === agentId)) return state;
      const agents = [...state.agents, archivedAgent];
      const archivedAgents = state.archivedAgents.filter((agent) => agent.id !== agentId);
      const runtimes = new Map(state.runtimes);
      runtimes.set(agentId, buildIdleRuntime(agentId));
      persistAgents(agents);
      persistArchivedAgents(archivedAgents);
      scheduleCloudPersist(agents, archivedAgents);
      return { agents, archivedAgents, runtimes };
    });
    return archivedAgent;
  },

  selectAgent: (id) => set({ selectedAgentId: id }),

  updateAgentStatus: (agentId, status) => {
    const runtimes = new Map(get().runtimes);
    const existing = runtimes.get(agentId);
    if (existing) {
      runtimes.set(agentId, {
        ...existing,
        internalStatus: status,
        lastActive: new Date(),
        progress: status === 'DONE' ? 100 : existing.progress,
      });
      set({ runtimes });
    }
  },

  updateAgentProgress: (agentId, progress) => {
    const runtimes = new Map(get().runtimes);
    const existing = runtimes.get(agentId);
    if (existing) {
      runtimes.set(agentId, { ...existing, progress, lastActive: new Date() });
      set({ runtimes });
    }
  },

  getAgentRuntime: (agentId) => get().runtimes.get(agentId),
  getAgentConfig: (agentId) => get().agents.find((a) => a.id === agentId),

  getActiveAgents: () => {
    return Array.from(get().runtimes.values()).filter(
      (r) => r.internalStatus !== 'IDLE' && r.internalStatus !== 'DONE'
    );
  },
}));
