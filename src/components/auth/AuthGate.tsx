"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff } from "lucide-react";

interface AuthGateProps {
  onSuccess: () => void;
}


export function AuthGate({ onSuccess }: AuthGateProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });
      if (!response.ok) {
        setError(true);
        setInput("");
        return;
      }
      sessionStorage.setItem("ah_auth", "1");
      onSuccess();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agenthub-light-shell fixed inset-0 z-50 flex items-center justify-center bg-[#f5f6fb]" style={{ backgroundImage: "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, transparent 60%)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[340px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white mb-1">AGENTHUB OS</h1>
          <p className="text-[11px] text-white/25">AI 员工操作系统</p>
        </div>

        {/* 登录框 */}
        <div className="backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="mb-4">
            <label className="text-[10px] text-white/30 mb-1.5 block">访问密码</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={input}
                onChange={e => { setInput(e.target.value); setError(false); }}
                onKeyDown={e => { if (e.key === "Enter") void handleSubmit(); }}
                placeholder="输入密码"
                autoFocus
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/15 outline-none focus:border-purple-500/40 transition-colors pr-10"
              />
              <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-rose-400 mb-3">
              密码错误，请重试
            </motion.p>
          )}

          <button onClick={() => void handleSubmit()} disabled={loading}
            className="w-full py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 transition-colors">
            进入系统
          </button>

          <p className="text-[9px] text-white/10 text-center mt-4">
            AgentHub OS · 默认密码 agenthub2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
