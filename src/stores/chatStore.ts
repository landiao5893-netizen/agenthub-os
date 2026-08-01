import { create } from 'zustand';
import { ChatMessage } from '@/types';
import { MOCK_CHAT_MESSAGES } from '@/lib/mock-data';

const CHAT_STORAGE_KEY = 'ah_chat_messages';

export function getChatMessageChannel(message: Pick<ChatMessage, "id" | "channel">): "discussion" | "execution" | "private" {
  if (message.channel) return message.channel;
  if (message.id.startsWith("group-")) return "discussion";
  if (message.id.startsWith("chat-u-") || message.id.startsWith("chat-a-") || message.id.startsWith("a-") || message.id === "m1") return "private";
  return "execution";
}



type CloudChatState = {
  revision: number;
  messages: Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>;
};

let chatCloudRevision = 0;
let chatCloudReady = false;
let chatCloudTimer: number | null = null;

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, ChatMessage>();
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Omit<ChatMessage, 'timestamp'> & { timestamp: string | Date };
    if (!candidate.id || !candidate.agentId || !candidate.content) return;
    const timestamp = new Date(candidate.timestamp);
    if (Number.isNaN(timestamp.getTime())) return;
    const message: ChatMessage = {
      ...candidate,
      channel: getChatMessageChannel(candidate),
      timestamp,
    };
    const existing = byId.get(message.id);
    if (!existing || existing.timestamp <= message.timestamp) byId.set(message.id, message);
  });
  return [...byId.values()]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .slice(-600);
}

function mergeMessages(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
  return normalizeMessages([...local, ...remote]);
}

async function saveChatCloud(messages: ChatMessage[]): Promise<void> {
  if (!chatCloudReady) return;
  try {
    const response = await fetch('/api/chat/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const payload = await response.json();
    if (response.ok && payload?.state) chatCloudRevision = Number(payload.state.revision ?? chatCloudRevision);
  } catch {
    // Local chat remains available and will retry on the next message.
  }
}

function scheduleChatCloud(messages: ChatMessage[]) {
  if (!chatCloudReady || typeof window === 'undefined') return;
  if (chatCloudTimer) window.clearTimeout(chatCloudTimer);
  chatCloudTimer = window.setTimeout(() => {
    chatCloudTimer = null;
    void saveChatCloud(messages);
  }, 300);
}

function restoreMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return MOCK_CHAT_MESSAGES;
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return MOCK_CHAT_MESSAGES;
    const parsed = JSON.parse(raw) as Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>;
    if (!Array.isArray(parsed)) return MOCK_CHAT_MESSAGES;
    return normalizeMessages(parsed);
  } catch {
    return MOCK_CHAT_MESSAGES;
  }
}

function persistMessages(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // localStorage can be unavailable in private mode; runtime history still works.
  }
}

interface ChatStore {
  messages: ChatMessage[];
  activeTab: string | null;
  openTabs: string[];
  hydrateFromStorage: () => void;
  syncFromCloud: () => Promise<void>;

  addMessage: (msg: ChatMessage) => void;
  setActiveTab: (agentId: string | null) => void;
  openTab: (agentId: string) => void;
  closeTab: (agentId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: MOCK_CHAT_MESSAGES,
  activeTab: null,
  openTabs: [],

  hydrateFromStorage: () => set({ messages: restoreMessages() }),

  syncFromCloud: async () => {
    try {
      const response = await fetch('/api/chat/state', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.initialized) {
        chatCloudReady = true;
        await saveChatCloud(get().messages);
        return;
      }
      const remote = payload.state as CloudChatState;
      const revision = Number(remote?.revision ?? 0);
      if (chatCloudReady && revision <= chatCloudRevision) return;
      const remoteMessages = normalizeMessages(remote?.messages);
      const localMessages = get().messages;
      const messages = mergeMessages(localMessages, remoteMessages);
      const remoteIds = new Set(remoteMessages.map((message) => message.id));
      const hasLocalOnlyMessages = localMessages.some((message) => !remoteIds.has(message.id));
      chatCloudRevision = revision;
      chatCloudReady = true;
      persistMessages(messages);
      set({ messages });
      if (hasLocalOnlyMessages) await saveChatCloud(messages);
    } catch {
      // Keep local messages when cloud synchronization is unavailable.
    }
  },

  addMessage: (msg) =>
    set((state) => {
      const messages = mergeMessages(state.messages, [{ ...msg, channel: getChatMessageChannel(msg) }]);
      persistMessages(messages);
      scheduleChatCloud(messages);
      return { messages };
    }),

  setActiveTab: (agentId) => set({ activeTab: agentId }),

  openTab: (agentId) =>
    set((state) => {
      if (state.openTabs.includes(agentId)) return { activeTab: agentId };
      return {
        openTabs: [...state.openTabs, agentId],
        activeTab: agentId,
      };
    }),

  closeTab: (agentId) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t !== agentId);
      return {
        openTabs: newTabs,
        activeTab:
          state.activeTab === agentId
            ? newTabs[newTabs.length - 1] ?? null
            : state.activeTab,
      };
    }),
}));
