"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  Award,
  Brain,
  BookOpen,
  Calendar,
} from "lucide-react";
import { GlassCard, SectionHeader, StatusDot } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { AgentProfile as AgentProfileType, STATUS_MAP } from "@/types";
import { useAgentStore } from "@/stores/agentStore";
import { AgentRuntimePanel } from "@/components/runtime/AgentRuntimePanel";
import { CollabDashboard } from "@/components/workflow/CollabDashboard";
import { AdapterConfigPanel } from "@/components/adapters/AdapterConfigPanel";
import { ControllerWorkLog } from "@/components/controller/ControllerWorkLog";
import { ConstitutionPanel } from "@/components/constitution/ConstitutionPanel";
import { ExecutionTimeline } from "@/components/runtime/ExecutionTimeline";

function getDotStyle(status: string) {
  switch (status) {
    case "THINKING": return "thinking";
    case "WORKING": case "TOOL_CALL": return "working";
    case "DONE": return "done";
    case "ERROR": return "error";
    default: return "idle";
  }
}

type ProfileTab = "profile" | "runtime" | "collab" | "adapter" | "controller" | "constitution" | "execute";

interface AgentProfileProps {
  profile: AgentProfileType;
  onBack: () => void;
}

export function AgentProfile({ profile, onBack }: AgentProfileProps) {
  const [tab, setTab] = useState<ProfileTab>("profile");
  const userStatus = STATUS_MAP[profile.status];
  const runtime = useAgentStore.getState().runtimes.get(profile.id);
  const progress = runtime?.progress ?? 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ===== 头部 + Tab 切换 ===== */}
      <div className="shrink-0 border-b border-ah-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-ah-surface text-ah-text-muted hover:text-ah-text-secondary transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-ah-text-primary truncate">{profile.name}</h2>
            <p className="text-[11px] text-ah-text-muted">{profile.title}</p>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex px-4 gap-1">
          {([
            ["profile", "档案"],
            ["runtime", "运行层"],
            ["collab", "协同"],
            ["adapter", "接入"],
            ["constitution", "宪法"],
            ["execute", "执行"],
            ...(profile.id === "controller" ? [["controller", "总控"] as [ProfileTab, string]] : []),
          ] as [ProfileTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2 text-xs font-medium border-b-2 transition-colors relative -mb-[1px]",
                tab === key
                  ? "text-ah-accent-purple border-ah-accent-purple"
                  : "text-ah-text-muted border-transparent hover:text-ah-text-secondary"
              )}
            >
              {label}
              {key === "runtime" && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-ah-accent-purple inline-block animate-status-breathe" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 内容区 ===== */}
      <div className="flex-1 overflow-y-auto">
        {tab === "runtime" ? (
          <AgentRuntimePanel agentId={profile.id} />
        ) : tab === "collab" ? (
          <CollabDashboard />
        ) : tab === "adapter" ? (
          <AdapterConfigPanel agentId={profile.id} />
        ) : tab === "controller" ? (
          <ControllerWorkLog />
        ) : tab === "constitution" ? (
          <ConstitutionPanel agentId={profile.id} />
        ) : tab === "execute" ? (
          <ExecutionTimeline agentId={profile.id} />
        ) : (
          <ProfileContent profile={profile} userStatus={userStatus} progress={progress} />
        )}
      </div>
    </div>
  );
}

// ============================================
// 档案内容（原 AgentProfile 内容）
// ============================================
function ProfileContent({
  profile,
  userStatus,
  progress,
}: {
  profile: AgentProfileType;
  userStatus: string;
  progress: number;
}) {
  return (
    <div className="p-3 md:p-4 space-y-3">
      {/* 基础信息 */}
      <GlassCard padding="md" glow="purple">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ah-surface border border-ah-border flex items-center justify-center text-2xl shrink-0"
            style={{ boxShadow: `0 0 20px ${profile.color}33` }}>
            {profile.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-ah-text-primary">{profile.name}</h3>
            <p className="text-sm text-ah-accent-purple">{profile.title}</p>
            <p className="text-[11px] text-ah-text-muted mt-1">{profile.department} · {profile.model}</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <StatusDot status={getDotStyle(profile.status)} />
                <span className="text-[11px] text-ah-text-secondary">{userStatus}</span>
              </div>
              {profile.currentTask && <span className="text-[10px] text-ah-text-muted truncate">{profile.currentTask}</span>}
            </div>
            {progress > 0 && (
              <div className="mt-2 h-1 bg-ah-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-ah-accent-purple to-ah-accent-blue transition-all duration-700"
                  style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* 角色描述 */}
      <GlassCard padding="md">
        <SectionHeader title="角色描述" />
        <p className="text-[12px] text-ah-text-secondary leading-relaxed">{profile.roleDescription}</p>
      </GlassCard>

      {/* AI 能力 */}
      <GlassCard padding="md">
        <SectionHeader title="AI 能力" subtitle={`${profile.skills.length} 项技能`} />
        <div className="space-y-2">
          {profile.skills.map((skill) => (
            <div key={skill.name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-ah-text-secondary">{skill.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={cn("w-2 h-2 rounded-sm", i <= skill.level ? "bg-ah-accent-purple" : "bg-ah-surface border border-ah-border")} />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-ah-text-muted">{skill.description}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 工具权限 */}
      <GlassCard padding="md">
        <SectionHeader title="工具权限" subtitle={`${profile.tools.filter(t => t.granted).length}/${profile.tools.length} 已授权`} />
        <div className="space-y-1.5">
          {profile.tools.map((tool) => (
            <div key={tool.name} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-colors",
              tool.granted ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-rose-500/5 border border-rose-500/10 opacity-60")}>
              <span className="text-sm">{tool.icon}</span>
              <span className={tool.granted ? "text-ah-text-secondary" : "text-ah-text-disabled"}>{tool.name}</span>
              <span className="text-[10px] text-ah-text-muted ml-auto">{tool.granted ? "已授权" : "未授权"}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 记忆系统 */}
      <GlassCard padding="md">
        <SectionHeader title="记忆系统" />
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5"><Brain size={12} className="text-ah-accent-purple" /><span className="text-[11px] font-medium text-ah-text-secondary">长期记忆</span></div>
            <div className="flex flex-wrap gap-1">
              {profile.memory.longTerm.map((m, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-ah-accent-purple/10 text-ah-accent-purple/80 border border-ah-accent-purple/20">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5"><Award size={12} className="text-amber-400" /><span className="text-[11px] font-medium text-ah-text-secondary">项目经验</span></div>
            <div className="space-y-1">
              {profile.memory.projectExperience.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-ah-surface">
                  <CheckCircle2 size={11} className="text-emerald-400 shrink-0" /><span className="text-[10px] text-ah-text-secondary">{p.name}</span><span className="text-[10px] text-ah-text-disabled">· {p.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5"><BookOpen size={12} className="text-blue-400" /><span className="text-[11px] font-medium text-ah-text-secondary">知识领域</span></div>
            <div className="flex flex-wrap gap-1">
              {profile.memory.knowledge.map((k, i) => (<span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{k}</span>))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 工作绩效 */}
      <GlassCard padding="md">
        <SectionHeader title="工作绩效" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            [profile.performance.tasksCompleted, "完成任务"],
            [profile.performance.projectsCount, "参与项目"],
            [`${profile.performance.successRate}%`, "成功率"],
          ].map(([v, l], i) => (
            <div key={i} className="p-3 rounded-xl bg-ah-surface border border-ah-border text-center">
              <p className="text-lg font-bold text-ah-text-primary">{v}</p>
              <p className="text-[10px] text-ah-text-muted">{l}</p>
            </div>
          ))}
          <div className="p-3 rounded-xl bg-ah-surface border border-ah-border text-center">
            <div className="flex items-center justify-center gap-0.5">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-lg font-bold text-ah-text-primary">{profile.performance.rating}</span>
            </div>
            <p className="text-[10px] text-ah-text-muted">评分</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {profile.performance.recentProjects.map((p, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-ah-surface border border-ah-border text-ah-text-secondary">{p}</span>
          ))}
        </div>
      </GlassCard>

      <div className="flex items-center justify-between text-[10px] text-ah-text-disabled px-1 pb-4">
        <div className="flex items-center gap-1"><Calendar size={10} /><span>加入于 {profile.createdAt}</span></div>
        <span>ID: {profile.id}</span>
      </div>
    </div>
  );
}
