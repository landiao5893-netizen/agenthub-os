"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  glow?: "purple" | "blue" | "cyan" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

export function GlassCard({
  children,
  className,
  interactive = false,
  glow = "none",
  padding = "md",
}: GlassCardProps) {
  const paddingMap = {
    none: "p-0",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const glowMap = {
    none: "",
    purple: "shadow-glow-purple",
    blue: "shadow-glow-blue",
    cyan: "shadow-glow-cyan",
  };

  return (
    <div
      className={cn(
        interactive ? "glass-card-interactive" : "glass-card",
        paddingMap[padding],
        glowMap[glow],
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// 状态指示点
// ============================================
interface StatusDotProps {
  status: "idle" | "thinking" | "working" | "done" | "error";
  size?: "sm" | "md";
}

export function StatusDot({ status, size = "sm" }: StatusDotProps) {
  const sizeMap = { sm: "w-2 h-2", md: "w-3 h-3" };
  return <span className={cn("status-dot", status, sizeMap[size])} />;
}

// ============================================
// 分区标题
// ============================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ah-text-muted">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-ah-text-disabled mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ============================================
// 徽标
// ============================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "purple" | "blue" | "green" | "red" | "amber";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variantMap = {
    default: "bg-ah-surface text-ah-text-secondary border-ah-border",
    purple:
      "bg-purple-500/10 text-purple-400 border-purple-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    amber:
      "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border",
        variantMap[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
