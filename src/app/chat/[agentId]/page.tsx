"use client";

import { useParams, useRouter } from "next/navigation";
import { AgentChat } from "@/components/chat/AgentChat";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  return (
    <div className="agenthub-light-shell h-[100dvh] min-h-[100svh] w-screen overflow-hidden bg-[#f5f6fb]">
      <AgentChat agentId={agentId} onBack={() => router.push("/")} />
    </div>
  );
}
