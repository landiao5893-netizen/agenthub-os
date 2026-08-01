"use client";

import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { KnowledgeView } from "@/components/knowledge/KnowledgeView";

export default function KnowledgePage() {
  return <AppShell centerPanel={<KnowledgeView />} leftPanel={<LeftSidebar />} hideRightPanel />;
}

