"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SimplePageProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  backHref?: string;
  onBack?: () => void;
}

export function SimplePage({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  contentClassName,
  backHref,
  onBack,
}: SimplePageProps) {
  const router = useRouter();

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-[#f7f8fc] text-slate-900", className)}>
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-4 md:px-8 md:py-5">
        <div className="mx-auto flex w-full max-w-[1120px] items-start gap-3">
          {(backHref || onBack) && (
            <button
              type="button"
              onClick={() => onBack ? onBack() : router.push(backHref!)}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              aria-label="返回"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="text-[10px] font-semibold uppercase text-violet-600">{eyebrow}</p>}
            <h1 className="mt-0.5 text-[22px] font-semibold text-slate-950 md:text-[24px]">{title}</h1>
            {description && <p className="mt-1.5 max-w-[680px] text-[12px] leading-5 text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7", contentClassName)}>
        <div className="mx-auto w-full max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}

