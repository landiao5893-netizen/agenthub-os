"use client";

import { useState, useEffect } from "react";
import { GlassCard, Badge } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { supervisorEngine } from "@/supervisor/engine";
import {
  SupervisorState, AgentSupervision, SupervisorLogEntry,
} from "@/supervisor/types";
import {
  Shield, CheckCircle2, RefreshCw,
  Activity, Eye, XCircle,
} from "lucide-react";
import { getAgentProfile } from "@/lib/agent-profiles";

function AgentRow({ sup }: { sup: AgentSupervision }) {
  const profile = getAgentProfile(sup.agentId);
  const color = profile?.color ?? "#71717a";

  const statusIcon = sup.currentStatus === "DONE" ? (
    <CheckCircle2 size={12} className="text-emerald-400" />
  ) : sup.currentStatus === "ERROR" ? (
    <XCircle size={12} className="text-rose-400" />
  ) : sup.currentStatus === "IDLE" ? (
    <Eye size={12} className="text-white/20" />
  ) : (
    <RefreshCw size={12} className="text-blue-400 animate-spin" />
  );

  const statusLabel: Record<string, string> = {
    IDLE: "就绪", THINKING: "思考中", WORKING: "执行中",
    DONE: "完成", ERROR: "需优化", WAITING: "等待中",
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl border bg-white/[0.015] border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
        {profile?.avatar?.slice(0,1) ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-white/80">{sup.agentName}</span>
          {statusIcon}
          <span className="text-[9px] text-white/30">{statusLabel[sup.currentStatus] ?? sup.currentStatus}</span>
        </div>
        <p className="text-[9px] text-white/25 truncate">{sup.taskTitle || "等待任务"}</p>
      </div>
      <div className="flex items-center gap-2">
        {sup.qualityScore && (
          <div className={cn(
            "text-[10px] font-mono font-bold tabular-nums",
            sup.qualityScore.passed ? "text-emerald-400" : "text-rose-400"
          )}>
            {sup.qualityScore.totalScore}
          </div>
        )}
        {sup.attempts > 1 && (
          <Badge variant="amber">{sup.attempts}x</Badge>
        )}
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: SupervisorLogEntry }) {
  const colorMap = {
    gate_check: "#71717a", recovery: "#f59e0b", pass: "#10b981",
    fail: "#f43f5e", retry: "#3b82f6", info: "#71717a",
  };

  const iconMap = {
    gate_check: <Eye size={10} />, recovery: <RefreshCw size={10} />,
    pass: <CheckCircle2 size={10} />, fail: <XCircle size={10} />,
    retry: <RefreshCw size={10} />, info: <Activity size={10} />,
  };

  return (
    <div className="flex items-start gap-2 py-0.5">
      <span style={{ color: colorMap[entry.type] }} className="mt-0.5 shrink-0">
        {iconMap[entry.type]}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-white/50">{entry.message}</span>
      </div>
      <span className="text-[8px] text-white/15 font-mono shrink-0">
        {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
      </span>
    </div>
  );
}

export function SupervisorView() {
  const [state, setState] = useState<SupervisorState>(supervisorEngine.getState());

  useEffect(() => {
    const unsub = supervisorEngine.subscribe(setState);
    const interval = setInterval(() => setState(supervisorEngine.getState()), 2000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-purple-400" />
          <div>
            <h3 className="text-[12px] font-semibold text-white/80">Supervisor · AI 主管</h3>
            <p className="text-[9px] text-white/25">监督执行 · 质量把关 · 失败恢复</p>
          </div>
        </div>
        <Badge variant={state.isActive ? "blue" : "green"}>
          {state.isActive ? "监督中" : "就绪"}
        </Badge>
      </div>

      {/* 项目信息 */}
      {state.projectId && (
        <GlassCard padding="md" glow="purple">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-white/70">{state.projectName}</span>
            <span className="text-[9px] text-white/25">{state.supervisedAgents.length} Agent</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["✅ 通过", state.gatesPassed, "#10b981"],
              ["❌ 未通过", state.gatesFailed, state.gatesFailed > 0 ? "#f43f5e" : "#71717a"],
              ["🔄 恢复", state.recoveryAttempts, state.recoveryAttempts > 0 ? "#f59e0b" : "#71717a"],
            ].map(([label, value, color]) => (
              <div key={label as string} className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[14px] font-bold" style={{ color: color as string }}>{value}</div>
                <div className="text-[8px] text-white/25">{label}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Agent 状态列表 */}
      {state.supervisedAgents.length > 0 && (
        <GlassCard padding="md">
          <div className="text-[10px] text-white/35 mb-2">AI 团队状态</div>
          <div className="space-y-1">
            {state.supervisedAgents.map(a => (
              <AgentRow key={a.agentId} sup={a} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* 监督日志 */}
      {state.log.length > 0 && (
        <GlassCard padding="md">
          <div className="text-[10px] text-white/35 mb-2">监督日志</div>
          <div className="space-y-0 max-h-[200px] overflow-y-auto">
            {state.log.slice().reverse().map(l => (
              <LogLine key={l.id} entry={l} />
            ))}
          </div>
        </GlassCard>
      )}

      {!state.isActive && (
        <div className="text-center py-8 text-white/10 text-xs">
          等待 Controller 启动项目
        </div>
      )}
    </div>
  );
}
