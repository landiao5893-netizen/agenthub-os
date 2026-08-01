"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { seedKnowledgeBase } from "@/knowledge/engine";
import { seedMemories } from "@/memory/store";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    seedMemories();
    seedKnowledgeBase();
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setAuthenticated(payload?.authenticated === true);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => { active = false; };
  }, []);

  if (!authChecked) return <div className="fixed inset-0 bg-[#f5f6fb]" />;
  if (!authenticated) return <AuthGate onSuccess={() => setAuthenticated(true)} />;
  return <HomeDashboard />;
}
