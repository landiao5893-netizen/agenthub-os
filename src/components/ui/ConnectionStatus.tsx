"use client";

import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  connected: boolean;
  className?: string;
}

export function ConnectionStatus({ connected, className }: ConnectionStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]",
        connected
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
        className
      )}
    >
      {connected ? (
        <>
          <Wifi size={10} className="animate-pulse" />
          <span>实时</span>
        </>
      ) : (
        <>
          <WifiOff size={10} />
          <span>离线</span>
        </>
      )}
    </motion.div>
  );
}
