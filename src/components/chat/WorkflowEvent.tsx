"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/types";
import { useAgentStore } from "@/stores/agentStore";
import {
  Terminal,
  Search,
  Wrench,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// ============================================
// 工具名称 → 人类可读描述
// ============================================
function getToolHumanLabel(toolName?: string): string {
  if (!toolName) return "执行操作";
  if (toolName.includes("terminal") || toolName.includes("Terminal"))
    return "正在执行命令";
  if (toolName.includes("search") || toolName.includes("Search"))
    return "正在搜索资料";
  if (toolName.includes("orchestrat") || toolName.includes("assign"))
    return "正在分配任务";
  if (toolName.includes("code_generate") || toolName.includes("code"))
    return "正在生成代码";
  if (toolName.includes("review"))
    return "正在审查代码";
  if (toolName.includes("image_gen") || toolName.includes("design"))
    return "正在生成图像";
  return "调用工具";
}

function getToolIcon(toolName?: string) {
  if (!toolName) return <FileText size={12} />;
  if (toolName.includes("search")) return <Search size={12} />;
  if (toolName.includes("terminal")) return <Terminal size={12} />;
  if (toolName.includes("orchestrat")) return <Wrench size={12} />;
  return <FileText size={12} />;
}

// ============================================
// 从文本消息提取任务描述
// ============================================
// ============================================
// 消息类型 → 状态颜色
// ============================================
function getStatusColor(agentId: string): string {
  const colorMap: Record<string, string> = {
    controller: "#8b5cf6",
    "research-1": "#3b82f6",
    "content-1": "#06b6d4",
    "design-1": "#f59e0b",
    "dev-1": "#10b981",
    "reviewer-1": "#f43f5e",
  };
  return colorMap[agentId] ?? "#8b5cf6";
}

// ============================================
// 单个工作事件
// ============================================
interface WorkflowEventProps {
  msg: ChatMessage;
  isLast: boolean;
}

export function WorkflowEvent({ msg, isLast }: WorkflowEventProps) {
  const [toolExpanded, setToolExpanded] = useState(false);
  const { agents } = useAgentStore();
  const agent = agents.find((a) => a.id === msg.agentId);
  const isToolCall = msg.type === "tool_call";
  const isSystem = msg.type === "system";
  const statusColor = getStatusColor(msg.agentId);

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[10px] text-ah-text-disabled bg-ah-surface px-3 py-0.5 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative pl-4"
    >
      {/* 左侧时间线 */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
        {/* 状态点 */}
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{
            backgroundColor: statusColor,
            boxShadow: `0 0 6px ${statusColor}66`,
          }}
        />
        {/* 连接线 */}
        {!isLast && (
          <div className="w-px flex-1 mt-1" style={{ backgroundColor: `${statusColor}22` }} />
        )}
      </div>

      {/* 内容区 */}
      <div className="ml-2 pb-3">
        {/* Agent 头部 */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px]">{agent?.avatar}</span>
          <span className="text-[11px] font-medium text-ah-text-primary">
            {agent?.name}
          </span>
          <ArrowRight size={10} className="text-ah-text-disabled" />
          <span className="text-[10px] text-ah-text-muted">
            {msg.timestamp.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* 任务/动作内容 */}
        {isToolCall ? (
          <div>
            {/* 人类可读描述 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-ah-text-secondary">
                {getToolHumanLabel(msg.toolName)}
              </span>
              <button
                onClick={() => setToolExpanded(!toolExpanded)}
                className="text-[10px] text-ah-text-disabled hover:text-ah-text-muted flex items-center gap-0.5"
              >
                {toolExpanded ? (
                  <>
                    收起 <ChevronUp size={10} />
                  </>
                ) : (
                  <>
                    详情 <ChevronDown size={10} />
                  </>
                )}
              </button>
            </div>

            {/* 技术详情（折叠） */}
            {toolExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-ah-surface border border-ah-border mb-1.5">
                  {getToolIcon(msg.toolName)}
                  <code className="text-[10px] text-blue-400 font-mono">
                    {msg.content}
                  </code>
                </div>
              </motion.div>
            )}

            {/* 结果 */}
            {msg.toolResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
              >
                <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-[10px] text-emerald-400">{msg.toolResult}</span>
              </motion.div>
            )}
          </div>
        ) : (
          /* 普通文本 → 任务描述 */
          <div className="text-[11px] text-ah-text-secondary leading-relaxed">
            {msg.content}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// 事件流容器
// ============================================
interface WorkflowEventStreamProps {
  messages: ChatMessage[];
}

export function WorkflowEventStream({ messages }: WorkflowEventStreamProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ah-text-disabled text-xs">
        暂无工作事件
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-0">
      {messages.map((msg, idx) => (
        <WorkflowEvent
          key={msg.id}
          msg={msg}
          isLast={idx === messages.length - 1}
        />
      ))}
    </div>
  );
}
