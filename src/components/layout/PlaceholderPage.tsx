"use client";
import { AppShell } from "@/components/layout/AppShell";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightPanel } from "@/components/monitor/RightPanel";
import { GlassCard } from "@/components/ui/GlassCard";

function placeholder(title: string, desc: string) {
  return (
    <div className="flex items-center justify-center h-full">
      <GlassCard padding="lg" className="text-center">
        <div className="text-3xl mb-3">🚧</div>
        <h3 className="text-sm font-semibold text-white/70 mb-1">{title}</h3>
        <p className="text-[11px] text-white/30">{desc}</p>
      </GlassCard>
    </div>
  );
}

export default function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return <AppShell centerPanel={placeholder(title, desc)} leftPanel={<LeftSidebar />} rightPanelOverride={<RightPanel />} />;
}
