import { create } from "zustand";

export type MobileTab = "agents" | "chat" | "monitor" | "more";
export type ViewMode = "chat" | "profile" | "agent_chat";
export type AppPage = "workspace" | "tasks" | "projects" | "experts" | "knowledge" | "tools" | "logs" | "settings";

interface UIStore {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  mobileTab: MobileTab;
  viewMode: ViewMode;
  profileAgentId: string | null;
  sideChatAgentId: string | null;
  sideSettingsAgentId: string | null;
  createDialogOpen: boolean;
  currentPage: AppPage;

  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftCollapsed: (v: boolean) => void;
  setRightCollapsed: (v: boolean) => void;
  setMobileTab: (tab: MobileTab) => void;
  openProfile: (agentId: string) => void;
  openChat: (agentId: string) => void;
  openSideChat: (agentId: string) => void;
  closeSideChat: () => void;
  openAgentSettings: (agentId: string) => void;
  closeAgentSettings: () => void;
  closeProfile: () => void;
  setCreateDialogOpen: (v: boolean) => void;
  setCurrentPage: (page: AppPage) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  leftCollapsed: false,
  rightCollapsed: true,
  mobileTab: "chat",
  viewMode: "chat",
  profileAgentId: null,
  sideChatAgentId: null,
  sideSettingsAgentId: null,
  createDialogOpen: false,
  currentPage: "workspace",

  toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  setLeftCollapsed: (v) => set({ leftCollapsed: v }),
  setRightCollapsed: (v) => set({ rightCollapsed: v }),
  setMobileTab: (tab) => set({ mobileTab: tab }),
  openProfile: (agentId) => set({ viewMode: "profile", profileAgentId: agentId }),
  openChat: (agentId) => set({ viewMode: "agent_chat", profileAgentId: agentId }),
  openSideChat: (agentId) => set({ sideChatAgentId: agentId, sideSettingsAgentId: null, rightCollapsed: false }),
  closeSideChat: () => set({ sideChatAgentId: null }),
  openAgentSettings: (agentId) => set({ sideSettingsAgentId: agentId, sideChatAgentId: null, rightCollapsed: false, mobileTab: "monitor" }),
  closeAgentSettings: () => set({ sideSettingsAgentId: null }),
  closeProfile: () => set({ viewMode: "chat", profileAgentId: null }),
  setCreateDialogOpen: (v) => set({ createDialogOpen: v }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
