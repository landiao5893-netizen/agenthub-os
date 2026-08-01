"use client";

import { AppShell } from "@/components/layout/AppShell";
import { RightPanel } from "@/components/monitor/RightPanel";
import { SmartWorkflowCanvas } from "@/components/workflow/SmartWorkflowCanvas";
import { useAgentBridge } from "@/hooks/useAgentBridge";

export default function WorkspacePage() {
  useAgentBridge();
  return (
    <AppShell
      centerPanel={<SmartWorkflowCanvas />}
      rightPanelOverride={<RightPanel />}
    />
  );
}
