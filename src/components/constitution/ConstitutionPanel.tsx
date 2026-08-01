"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2, Ban,
  Lightbulb, Gavel, FileCheck, ArrowRight,
} from "lucide-react";
import { GlassCard, SectionHeader } from "@/components/ui/GlassCard";
import { getConstitution } from "@/constitution/data";

interface ConstitutionPanelProps {
  agentId: string;
}

export function ConstitutionPanel({ agentId }: ConstitutionPanelProps) {
  const constitution = getConstitution(agentId);

  if (!constitution) {
    return (
      <div className="h-full flex items-center justify-center text-ah-text-disabled text-xs">
        该 Agent 尚未定义工作宪法
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* ===== 头部 ===== */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-9 h-9 rounded-xl bg-ah-accent-purple/10 border border-ah-accent-purple/20 flex items-center justify-center">
          <Gavel size={16} className="text-ah-accent-purple" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ah-text-primary">工作宪法</h3>
          <p className="text-[10px] text-ah-text-muted">定义独立的工作方式和行为准则</p>
        </div>
      </div>

      {/* ===== 工作原则 ===== */}
      <GlassCard padding="md">
        <SectionHeader title="工作原则" subtitle="指导行为的基本准则" />
        <div className="space-y-1.5">
          {constitution.workingPrinciples.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-ah-surface"
            >
              <Lightbulb size={12} className="text-amber-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-ah-text-secondary">{p}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* ===== 决策习惯 ===== */}
      <GlassCard padding="md">
        <SectionHeader title="决策习惯" subtitle="面对选择时的默认倾向" />
        <div className="space-y-1.5">
          {constitution.decisionHabits.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
            >
              <ArrowRight size={12} className="text-blue-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-ah-text-secondary">{h}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* ===== 输出标准 ===== */}
      <GlassCard padding="md">
        <SectionHeader title="输出标准" subtitle="交付物的质量要求" />
        <div className="space-y-1.5">
          {constitution.outputStandards.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
            >
              <FileCheck size={12} className="text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-emerald-400">{s}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* ===== 禁止事项 ===== */}
      <GlassCard padding="md" glow="none">
        <SectionHeader title="禁止事项" subtitle="绝对不可违反的红线" />
        <div className="space-y-1.5">
          {constitution.prohibitions.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10"
            >
              <Ban size={12} className="text-rose-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-rose-400">{p}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* ===== 专业流程 ===== */}
      <GlassCard padding="md">
        <SectionHeader title="专业流程" subtitle={`${constitution.professionalWorkflow.length} 步标准化工作`} />
        <div className="relative pl-4">
          {constitution.professionalWorkflow.map((step, i) => {
            const isLast = i === constitution.professionalWorkflow.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.05 }}
                className="relative pb-3"
              >
                {/* 时间线 */}
                <div className="absolute left-[-16px] top-0 bottom-0 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-ah-accent-purple/10 border border-ah-accent-purple/30 flex items-center justify-center text-[10px] font-bold text-ah-accent-purple">
                    {step.order}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-ah-border mt-1" />}
                </div>

                <div className="ml-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-ah-text-primary">{step.phase}</span>
                    <span className="text-[10px] text-ah-text-disabled">Step {step.order}</span>
                  </div>
                  <p className="text-[10px] text-ah-text-secondary mt-0.5">{step.action}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                    <span className="text-[10px] text-ah-text-muted">{step.check}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
