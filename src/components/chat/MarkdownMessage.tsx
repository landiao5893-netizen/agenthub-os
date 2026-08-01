"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownMessage({ content, compact = false }: { content: string; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = content.length > 1200;
  const normalizedContent = content.split("\n").length <= 2 && content.length > 160
    ? content
        .replace(/[ \t]+---[ \t]+/g, "\n\n---\n\n")
        .replace(/[ \t]+(?=#{1,3}\s)/g, "\n\n")
        .replace(/[ \t]+(?=\*\*[^*\n]{2,32}\*\*)/g, "\n\n")
        .replace(/[ \t]+(?=(?:\d+\.|[-*])\s)/g, "\n")
    : content;

  return (
    <div className="relative">
      <div className={cn(
        "markdown-message break-words text-white/72",
        compact ? "text-[11px] leading-6" : "text-[13px] leading-7",
        collapsible && !expanded && "max-h-80 overflow-hidden",
      )}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedContent}</ReactMarkdown>
      </div>
      {collapsible && !expanded && <div className="pointer-events-none absolute inset-x-0 bottom-8 h-16 bg-gradient-to-t from-[#15151b] to-transparent" />}
      {collapsible && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="relative mt-2 flex h-7 items-center gap-1 text-[11px] text-cyan-300/65 hover:text-cyan-200">
          {expanded ? <><ChevronUp size={13} />收起内容</> : <><ChevronDown size={13} />展开全文</>}
        </button>
      )}
    </div>
  );
}
