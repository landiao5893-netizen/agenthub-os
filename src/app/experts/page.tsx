"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { ExpertLibrary } from "@/components/agents/ExpertLibrary";
import { AgentChat } from "@/components/chat/AgentChat";
import { getAgentProfile } from "@/lib/agent-profiles";
import { useUIStore } from "@/stores/uiStore";

export default function ExpertsPage() {
  const { viewMode, profileAgentId, closeProfile, setCurrentPage } = useUIStore();
  const profile = profileAgentId ? getAgentProfile(profileAgentId) : undefined;

  useEffect(() => { setCurrentPage("experts"); }, [setCurrentPage]);

  const centerPanel = viewMode === "agent_chat" && profile
    ? <AgentChat agentId={profileAgentId!} onBack={closeProfile} />
    : <ExpertLibrary />;

  return <AppShell centerPanel={centerPanel} leftPanel={<LeftSidebar />} hideRightPanel />;
}
