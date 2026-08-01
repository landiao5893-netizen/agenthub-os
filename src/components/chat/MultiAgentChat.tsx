"use client";

import { getChatMessageChannel, useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import { cn } from "@/lib/utils";
import { orchestrator } from "@/controller/orchestrator";
import { useWorkflowStore } from "@/stores/workflowStore";
import { adapterRegistry } from "@/adapters/registry";
import { AGENTHUB_HERMES_SOURCE, getAgentHubHermesSessionSource } from "@/lib/hermes-session";
import type { AgentConfig } from "@/types";

// ... (other imports)
import { AtSign, Reply, Sparkles, Send, MessageCircle, Play, Square, UsersRound, X } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectOverview } from "./ProjectOverview";
import { CompactAgentBar } from "./CompactAgentBar";
import { MarkdownMessage } from "./MarkdownMessage";
import {
  Wrench,
  Terminal,
  Search,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/GlassCard";
import { PENDING_HOME_TASK_KEY } from "@/lib/home-task";

// ============================================
// 桌面端用：工具图标
// ============================================
function getToolIcon(name: string) {
  if (name.includes("search")) return <Search size={12} />;
  if (name.includes("terminal")) return <Terminal size={12} />;
  if (name.includes("orchestrat")) return <Wrench size={12} />;
  return <FileText size={12} />;
}

// ============================================
// 移动端用：工具人类化文案
// ============================================
function getToolHumanLabel(toolName?: string): string {
  if (!toolName) return "执行操作";
  if (toolName.includes("terminal")) return "正在执行命令";
  if (toolName.includes("search")) return "正在搜索资料";
  if (toolName.includes("orchestrat") || toolName.includes("assign"))
    return "正在分配任务";
  if (toolName.includes("code")) return "正在生成代码";
  if (toolName.includes("image_gen")) return "正在生成图像";
  return "调用工具";
}

function getAgentColor(agentId: string): string {
  const m: Record<string, string> = {
    controller: "#8b5cf6",
    "research-1": "#3b82f6",
    "content-1": "#06b6d4",
    "design-1": "#f59e0b",
    "dev-1": "#10b981",
    "reviewer-1": "#f43f5e",
  };
  return m[agentId] ?? "#8b5cf6";
}

const ROLE_MENTION_ALIASES: Record<AgentConfig["role"], string[]> = {
  controller: ["Controller", "主控", "项目经理"],
  research: ["Research", "研究", "研究员"],
  content: ["Content", "内容", "内容创作者"],
  design: ["Design", "设计", "视觉设计师"],
  developer: ["Developer", "开发", "开发工程师"],
  reviewer: ["Reviewer", "审核", "质量审核员"],
  analyst: ["Analyst", "分析", "分析师"],
};

function findMentionedAgent(text: string, agents: AgentConfig[]) {
  const source = text.toLocaleLowerCase();
  const matches = agents.flatMap((agent) => {
    const aliases = new Set([
      agent.name,
      agent.name.replace(/\s+Agent$/i, ""),
      agent.roleLabel,
      agent.id,
      agent.id.split("-")[0],
      ...ROLE_MENTION_ALIASES[agent.role],
    ].filter(Boolean));
    return [...aliases].map((alias) => ({
      agent,
      index: source.indexOf("@" + alias.toLocaleLowerCase()),
      length: alias.length,
    }));
  }).filter((match) => match.index >= 0);
  matches.sort((a, b) => a.index - b.index || b.length - a.length);
  return matches[0]?.agent ?? null;
}
type DiscussionEndCondition = "consensus" | "no_new" | "reviewer";

const ROUND_TABLE_PATTERN = /大家讨论|全员讨论|一起讨论|开个会|会议|会商|集体分析|一起分析/;

function findImplicitAgent(text: string, agents: AgentConfig[]) {
  const explicitRoles: Array<[RegExp, AgentConfig["role"]]> = [
    [/(?:研究员|Research)/i, "research"],
    [/(?:内容创作者|文案|Content)/i, "content"],
    [/(?:视觉设计师|设计师|Design)/i, "design"],
    [/(?:开发工程师|程序员|Developer)/i, "developer"],
    [/(?:质量审核员|审核员|Reviewer)/i, "reviewer"],
    [/(?:项目经理|主控|Controller)/i, "controller"],
  ];
  const explicit = explicitRoles.find(([pattern]) => pattern.test(text));
  if (explicit) return agents.find((agent) => agent.role === explicit[1]) ?? null;

  const intentRoles: Array<[RegExp, AgentConfig["role"]]> = [
    [/(调研|查资料|竞品|市场情况|数据来源)/, "research"],
    [/(文案|标题|改写|内容结构|措辞)/, "content"],
    [/(视觉|配色|版式|海报|图片风格)/, "design"],
    [/(代码|开发|接口|技术实现|程序)/, "developer"],
    [/(审核|检查|风险|质量|合规)/, "reviewer"],
  ];
  const intent = intentRoles.find(([pattern]) => pattern.test(text));
  return intent ? agents.find((agent) => agent.role === intent[1]) ?? null : null;
}

async function requestDiscussionReply(agent: AgentConfig, text: string, context = "", signal?: AbortSignal) {
  const binding = adapterRegistry.getBinding(agent.id);
  const directProvider = binding && ["openai", "claude", "deepseek", "custom"].includes(binding.provider);
  const endpoint = "/api/intelligence/runs";
  const prompt = `你是 AgentHub OS 的 ${agent.name}，岗位是${agent.roleLabel}。
当前处于团队讨论模式，只讨论和提出建议，禁止拆分任务、禁止调度 Agent、禁止启动项目。
你的专长：${agent.skills.join("、") || "综合分析"}
${context ? `\n以下是此前讨论，请先阅读再回应，避免重复：\n${context.slice(-14000)}\n` : ""}
当前话题：${text}

请直接给出你的专业观点，控制在 500 字以内。会议时在末尾附上：[新增观点:有/无] [共识状态:达成/未达成]；Reviewer 可附上 [审核结论:可结束/继续讨论]。`;
  const requestBody = {
    input: prompt,
    provider: directProvider ? binding.provider : "opencode-go",
      providerConfigId: binding?.providerConfigId,
    model: binding?.model ?? agent.model,
    apiUrl: directProvider ? binding.apiUrl : undefined,
    apiToken: directProvider ? binding.apiToken : undefined,
    source: AGENTHUB_HERMES_SOURCE,
    session_source: getAgentHubHermesSessionSource("group_discussion", agent.id),
    run_mode: "group_discussion",
    timeout_ms: 90000,
  };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 100000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const data = await response.json();
    const resultContent = data?.result?.content;
    const output = data?.result?.text
      ?? (typeof resultContent === "string" ? resultContent : resultContent ? JSON.stringify(resultContent) : undefined)
      ?? data?.output;
    if (!response.ok || data?.ok === false || !output) {
      throw new Error(String(data?.error ?? `${agent.name} 暂时无法响应。`));
    }
    return String(output);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

function cleanDiscussionMarkers(content: string) {
  return content
    .replace(/\s*\[新增观点[:：]\s*(?:有|无)\]/g, "")
    .replace(/\s*\[共识状态[:：]\s*(?:达成|未达成)\]/g, "")
    .replace(/\s*\[审核结论[:：]\s*(?:可结束|继续讨论)\]/g, "")
    .trim();
}
// ============================================
// 移动端：工作事件流
// ============================================
function MobileWorkflowView({
  mode,
  onReply,
}: {
  mode: "discussion" | "execute";
  onReply: (agentId: string) => void;
}) {
  const { messages, activeTab } = useChatStore();
  const { agents } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, mode, activeTab]);

  const channelMessages = messages.filter(
    (message) => getChatMessageChannel(message) === (mode === "discussion" ? "discussion" : "execution"),
  );
  const filtered = activeTab
    ? channelMessages.filter(
        (message) => message.agentId === activeTab || message.agentId === "controller",
      )
    : channelMessages;

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-ah-text-disabled text-xs">
        暂无工作事件
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-0">
      {filtered.map((msg, idx) => {
        const agent = agents.find((a) => a.id === msg.agentId);
        const isToolCall = msg.type === "tool_call";
        const isSystem = msg.type === "system";
        const isUser = msg.role === "user";
        const isLast = idx === filtered.length - 1;
        const color = getAgentColor(msg.agentId);
        const toolExpanded = expandedTools.has(msg.id);

        if (isSystem) {
          return (
            <div key={msg.id} className="flex justify-center py-1">
              <span className="text-[10px] text-ah-text-disabled bg-ah-surface px-3 py-0.5 rounded-full">
                {msg.content}
              </span>
            </div>
          );
        }

        if (isUser) {
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pb-3">
              <div className="max-w-[82%]">
                <div className="mb-1 flex items-center justify-end gap-1.5">
                  <span className="text-[10px] text-ah-text-disabled">
                    {msg.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[11px] font-medium text-white/70">老板</span>
                </div>
                <div className="rounded-xl rounded-tr-sm border border-violet-400/20 bg-violet-500/12 px-3 py-2 text-[11px] leading-relaxed text-violet-50/90">
                  {msg.content}
                </div>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative pl-4"
          >
            {/* 时间线 */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
              <div
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}66`,
                }}
              />
              {!isLast && (
                <div
                  className="w-px flex-1 mt-1"
                  style={{ backgroundColor: `${color}22` }}
                />
              )}
            </div>

            {/* 内容 */}
            <div className="ml-2 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px]">{agent?.avatar}</span>
                <span className="text-[11px] font-medium text-ah-text-primary">
                  {agent?.name}
                </span>
                <ArrowRight size={10} className="text-ah-text-disabled" />
                <span className="text-[10px] text-ah-text-disabled">
                  {msg.timestamp.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {mode === "discussion" && agent && (
                  <button
                    type="button"
                    onClick={() => onReply(agent.id)}
                    className="ml-auto rounded p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                    aria-label={`回复 ${agent.name}`}
                    title={`回复 ${agent.name}`}
                  >
                    <Reply size={11} />
                  </button>
                )}
              </div>

              {isToolCall ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-ah-text-secondary">
                      {getToolHumanLabel(msg.toolName)}
                    </span>
                    <button
                      onClick={() => toggleTool(msg.id)}
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

                  {toolExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-ah-surface border border-ah-border mb-1.5">
                        {getToolIcon(msg.toolName ?? "")}
                        <code className="text-[10px] text-blue-400 font-mono">
                          {msg.content}
                        </code>
                      </div>
                    </motion.div>
                  )}

                  {msg.toolResult && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-emerald-400">
                        {msg.toolResult}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <MarkdownMessage content={msg.content} compact />

              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// 桌面端：聊天消息视图（保持原样）
// ============================================
function DesktopChatView({
  mode,
  onReply,
}: {
  mode: "discussion" | "execute";
  onReply: (agentId: string) => void;
}) {
  const { messages, activeTab, openTabs, closeTab, setActiveTab } =
    useChatStore();
  const { agents } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, mode, activeTab]);

  const channelMessages = messages.filter(
    (message) => getChatMessageChannel(message) === (mode === "discussion" ? "discussion" : "execution"),
  );
  const filtered = activeTab
    ? channelMessages.filter(
        (message) => message.agentId === activeTab || message.agentId === "controller",
      )
    : channelMessages;

  const getAgentInfo = (agentId: string) =>
    agents.find((a) => a.id === agentId);

  return (
    <>
      {/* 桌面标签栏 */}
      <div className="flex items-center h-12 px-3 border-b border-ah-border gap-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab(null)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0",
            !activeTab
              ? "bg-ah-surface text-ah-text-primary"
              : "text-ah-text-muted hover:text-ah-text-secondary"
          )}
        >
          <Sparkles size={12} className="inline mr-1" />
          团队群聊
        </button>

        <AnimatePresence>
          {openTabs.map((agentId) => {
            const agent = getAgentInfo(agentId);
            if (!agent) return null;
            const isActive = activeTab === agentId;
            return (
              <motion.button
                key={agentId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setActiveTab(agentId)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-ah-surface text-ah-text-primary"
                    : "text-ah-text-muted hover:text-ah-text-secondary"
                )}
              >
                <span>{agent.avatar}</span>
                <span>{agent.name}</span>
                <X
                  size={14}
                  className="ml-0.5 opacity-50 hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(agentId);
                  }}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 桌面消息列表 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {filtered.map((msg, idx) => {
          const agent = getAgentInfo(msg.agentId);
          const isToolCall = msg.type === "tool_call";
          const isSystem = msg.type === "system";
          const isUser = msg.role === "user";

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.3) }}
              className={cn("flex gap-3", isSystem && "justify-center", isUser && "justify-end")}
            >
              {!isSystem && !isUser && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-ah-surface border border-ah-border flex items-center justify-center text-xs">
                  {agent?.avatar ?? "🤖"}
                </div>
              )}
              <div className={cn("min-w-0", isSystem ? "flex-none" : isUser ? "max-w-[78%]" : "flex-1")}>
                {!isSystem && (
                  <div className={cn("flex items-center gap-2 mb-1", isUser && "justify-end")}>
                    <span className="text-xs font-medium text-ah-text-primary">
                      {isUser ? "老板" : (agent?.name ?? "System")}
                    </span>
                    <span className="text-[10px] text-ah-text-disabled">
                      {msg.timestamp.toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isToolCall && <Badge variant="blue">工具调用</Badge>}
                    {mode === "discussion" && !isUser && agent && (
                      <button
                        type="button"
                        onClick={() => onReply(agent.id)}
                        className="ml-auto rounded p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                        aria-label={`回复 ${agent.name}`}
                        title={`回复 ${agent.name}`}
                      >
                        <Reply size={12} />
                      </button>
                    )}
                  </div>
                )}
                {isToolCall ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ah-surface border border-ah-border">
                      {getToolIcon(msg.toolName ?? "")}
                      <code className="text-xs text-blue-400 font-mono truncate">
                        {msg.content}
                      </code>
                    </div>
                    {msg.toolResult && (
                      <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400">
                        {msg.toolResult}
                      </div>
                    )}
                  </div>
                ) : isSystem ? (
                  <span className="text-[11px] text-ah-text-disabled bg-ah-surface px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                ) : (
                  <div className={cn("rounded-xl border px-4 py-3", isUser ? "rounded-tr-sm border-violet-400/20 bg-violet-500/12 text-sm leading-relaxed text-violet-50/90" : "border-ah-border bg-ah-surface") }>
                    {isUser ? msg.content : <MarkdownMessage content={msg.content} />}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

// ============================================
// 主入口
// ============================================
export function MultiAgentChat() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"discussion" | "execute">("discussion");
  const [sending, setSending] = useState(false);
  const [replyAgentId, setReplyAgentId] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [roundtableOpen, setRoundtableOpen] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [maxRounds, setMaxRounds] = useState(3);
  const [endConditions, setEndConditions] = useState<DiscussionEndCondition[]>([
    "consensus",
    "no_new",
    "reviewer",
  ]);
  const [roundtableRunning, setRoundtableRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundtableAbortRef = useRef<AbortController | null>(null);
  const pendingHomeTaskHandledRef = useRef(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const agents = useAgentStore((state) => state.agents);
  const isRunning = useWorkflowStore((state) => state.isRunning);

  useEffect(() => {
    setSelectedAgentIds((current) => {
      const available = current.filter((id) => agents.some((agent) => agent.id === id));
      return current.length === 0 ? agents.map((agent) => agent.id) : available;
    });
  }, [agents]);

  useEffect(() => {
    if (pendingHomeTaskHandledRef.current) return;
    const task = window.sessionStorage.getItem(PENDING_HOME_TASK_KEY)?.trim();
    if (!task) return;
    pendingHomeTaskHandledRef.current = true;
    window.sessionStorage.removeItem(PENDING_HOME_TASK_KEY);
    setMode("execute");
    addMessage({
      id: "execution-user-" + Date.now(),
      agentId: "controller",
      role: "user",
      channel: "execution",
      content: task,
      type: "text",
      timestamp: new Date(),
    });
    void orchestrator.execute(task);
  }, [addMessage]);

  const mentionMatch = mode === "discussion" ? input.match(/@([^@\s]*)$/) : null;
  const mentionQuery = mentionMatch?.[1].toLocaleLowerCase() ?? "";
  const mentionCandidates = agents.filter((agent) => {
    const searchable = [agent.name, agent.roleLabel, agent.id, ...ROLE_MENTION_ALIASES[agent.role]]
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(mentionQuery);
  });

  const addDiscussionMessage = (
    id: string,
    agentId: string,
    role: "user" | "agent",
    content: string,
    type: "text" | "system" = "text",
  ) => {
    addMessage({
      id,
      agentId,
      role,
      channel: "discussion",
      content,
      type,
      timestamp: new Date(),
    });
  };

  const runRoundtable = async (topic: string) => {
    const participants = agents.filter((agent) => selectedAgentIds.includes(agent.id));
    if (!topic || participants.length === 0 || roundtableRunning || sending) return;

    const abortController = new AbortController();
    roundtableAbortRef.current = abortController;
    setInput("");
    setReplyAgentId(null);
    setMentionOpen(false);
    setRoundtableOpen(false);
    setRoundtableRunning(true);
    setSending(true);
    addDiscussionMessage(`roundtable-user-${Date.now()}`, "controller", "user", topic);

    let transcript = "";
    let completedRounds = 0;
    let endReason = `达到 ${maxRounds} 轮上限`;

    try {
      for (let round = 1; round <= maxRounds; round += 1) {
        if (abortController.signal.aborted) break;
        addDiscussionMessage(
          `roundtable-system-${Date.now()}-${round}`,
          "controller",
          "agent",
          `会议第 ${round} 轮 · ${participants.length} 名员工`,
          "system",
        );

        const results = await Promise.all(
          participants.map(async (agent) => {
            try {
              const raw = await requestDiscussionReply(agent, topic, transcript, abortController.signal);
              return {
                agent,
                raw,
                output: cleanDiscussionMarkers(raw),
                hasNew: /\[新增观点[:：]\s*有\]/.test(raw),
                noNew: /\[新增观点[:：]\s*无\]/.test(raw),
                consensus: /\[共识状态[:：]\s*达成\]/.test(raw),
                reviewerEnd: agent.role === "reviewer" && /\[审核结论[:：]\s*可结束\]/.test(raw),
              };
            } catch (error: unknown) {
              if (abortController.signal.aborted) return null;
              const message = error instanceof Error ? error.message : "未知错误";
              addDiscussionMessage(
                `roundtable-error-${agent.id}-${Date.now()}-${round}`,
                agent.id,
                "agent",
                `响应失败：${message}`,
              );
              return null;
            }
          }),
        );

        if (abortController.signal.aborted) break;
        const successful = results.filter((result): result is NonNullable<typeof result> => result !== null);
        successful.forEach((result, index) => {
          addDiscussionMessage(
            `roundtable-${result.agent.id}-${Date.now()}-${round}-${index}`,
            result.agent.id,
            "agent",
            result.output,
          );
          transcript += `\n第${round}轮 ${result.agent.name}：${result.output}`;
        });
        completedRounds = round;

        if (round >= 2 && successful.length > 0) {
          const consensusReached = endConditions.includes("consensus")
            && successful.filter((result) => result.consensus).length >= Math.ceil(successful.length * 0.7);
          const noNewIdeas = endConditions.includes("no_new")
            && successful.every((result) => result.noNew && !result.hasNew);
          const reviewerApproved = endConditions.includes("reviewer")
            && successful.some((result) => result.reviewerEnd);
          if (reviewerApproved || consensusReached || noNewIdeas) {
            endReason = reviewerApproved ? "Reviewer 确认可结束" : consensusReached ? "已达成共识" : "本轮无新增观点";
            break;
          }
        }
      }

      if (!abortController.signal.aborted) {
        const controller = agents.find((agent) => agent.role === "controller");
        if (controller && transcript) {
          try {
            const summary = await requestDiscussionReply(
              controller,
              `请汇总围绕“${topic}”的会议结论、分歧和下一步建议。只做总结，不执行任务。`,
              transcript,
              abortController.signal,
            );
            addDiscussionMessage(
              `roundtable-summary-${Date.now()}`,
              controller.id,
              "agent",
              cleanDiscussionMarkers(summary),
            );
          } catch (error: unknown) {
            if (!abortController.signal.aborted) {
              const message = error instanceof Error ? error.message : "未知错误";
              addDiscussionMessage(`roundtable-summary-error-${Date.now()}`, controller.id, "agent", `会议总结失败：${message}`);
            }
          }
        }
        if (!abortController.signal.aborted) {
          addDiscussionMessage(
            `roundtable-end-${Date.now()}`,
            "controller",
            "agent",
            `会议结束 · ${completedRounds} 轮 · ${endReason}`,
            "system",
          );
        }
      }
    } finally {
      if (abortController.signal.aborted) {
        addDiscussionMessage(`roundtable-stopped-${Date.now()}`, "controller", "agent", "会议已手动停止", "system");
      }
      roundtableAbortRef.current = null;
      setRoundtableRunning(false);
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();

    if (mode === "execute") {
      setInput("");
      addMessage({
        id: "execution-user-" + Date.now(),
        agentId: "controller",
        role: "user",
        channel: "execution",
        content: text,
        type: "text",
        timestamp: new Date(),
      });
      void orchestrator.execute(text);
      return;
    }

    if (roundtableOpen || ROUND_TABLE_PATTERN.test(text)) {
      if (selectedAgentIds.length === 0) {
        addDiscussionMessage(`roundtable-empty-${Date.now()}`, "controller", "agent", "请先选择至少一名参与会议的员工。", "system");
        return;
      }
      await runRoundtable(text);
      return;
    }

    setInput("");
    setMentionOpen(false);
    addDiscussionMessage(`group-user-${Date.now()}`, "controller", "user", text);
    const mentionedAgent = findMentionedAgent(text, agents);
    const repliedAgent = agents.find((agent) => agent.id === replyAgentId);
    const implicitAgent = findImplicitAgent(text, agents);
    const replyAgent = mentionedAgent
      ?? repliedAgent
      ?? implicitAgent
      ?? agents.find((agent) => agent.role === "controller");
    setReplyAgentId(null);
    if (!replyAgent) {
      addDiscussionMessage(`group-system-${Date.now()}`, "controller", "agent", "未找到可响应的 Agent。", "system");
      return;
    }

    setSending(true);
    try {
      const output = await requestDiscussionReply(replyAgent, text);
      addDiscussionMessage(`group-${replyAgent.id}-${Date.now()}`, replyAgent.id, "agent", cleanDiscussionMarkers(output));
    } catch (err: unknown) {
      addDiscussionMessage(
        `group-${replyAgent.id}-${Date.now()}`,
        replyAgent.id,
        "agent",
        err instanceof Error ? `响应失败：${err.message}` : `${replyAgent.name} 暂时无法响应。`,
      );
    } finally {
      setSending(false);
    }
  };

  const chooseMention = (agent: AgentConfig) => {
    setInput((current) => current.replace(/@[^@\s]*$/, `@${agent.name} `));
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const startReply = (agentId: string) => {
    setMode("discussion");
    setReplyAgentId(agentId);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mobile-mode-toolbar flex h-9 shrink-0 items-center gap-2 border-b border-ah-border px-3">
        <div className="flex items-center rounded-lg border border-white/[0.06] bg-white/[0.025] p-0.5">
          <button
            type="button"
            onClick={() => setMode("discussion")}
            className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition-colors", mode === "discussion" ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60")}
          >
            <MessageCircle size={13} /> 讨论
          </button>
          <button
            type="button"
            onClick={() => setMode("execute")}
            className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition-colors", mode === "execute" ? "bg-violet-500/20 text-violet-200" : "text-white/35 hover:text-white/60")}
          >
            <Play size={13} /> 执行任务
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {mode === "discussion" && (
            <button
              type="button"
              onClick={() => {
                if (roundtableRunning) roundtableAbortRef.current?.abort();
                else setRoundtableOpen((open) => !open);
              }}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] transition-colors",
                roundtableRunning
                  ? "border-red-400/25 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:bg-white/[0.06] hover:text-white/80",
              )}
            >
              {roundtableRunning ? <Square size={12} fill="currentColor" /> : <UsersRound size={13} />}
              {roundtableRunning ? "结束会议" : "会议模式"}
            </button>
          )}
          {isRunning && (
            <button
              type="button"
              onClick={() => orchestrator.stop()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-500/10 px-2.5 text-[11px] text-red-300 transition-colors hover:bg-red-500/20"
            >
              <Square size={12} fill="currentColor" /> 紧急停止
            </button>
          )}
        </div>
      </div>

      {mode === "discussion" && roundtableOpen && !roundtableRunning && (
        <div className="mobile-roundtable-panel shrink-0 border-b border-ah-border bg-white/[0.015] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-white/70">参与员工 · 不限人数</span>
            <div className="flex gap-2 text-[10px]">
              <button type="button" onClick={() => setSelectedAgentIds(agents.map((agent) => agent.id))} className="text-violet-300 hover:text-violet-200">全选</button>
              <button type="button" onClick={() => setSelectedAgentIds([])} className="text-white/35 hover:text-white/60">清空</button>
            </div>
          </div>
          <div className="mb-2.5 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
            {agents.map((agent) => {
              const selected = selectedAgentIds.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentIds((current) => selected ? current.filter((id) => id !== agent.id) : [...current, agent.id])}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-md border px-2 text-[10px] transition-colors",
                    selected ? "border-violet-400/30 bg-violet-500/15 text-violet-100" : "border-white/[0.06] text-white/35 hover:text-white/60",
                  )}
                >
                  <span>{agent.avatar}</span>{agent.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[10px] text-white/35">最多轮数</span>
              {[2, 3, 4, 5].map((round) => (
                <button key={round} type="button" onClick={() => setMaxRounds(round)} className={cn("h-6 min-w-6 rounded text-[10px]", maxRounds === round ? "bg-violet-500/20 text-violet-200" : "text-white/35 hover:bg-white/[0.04]")}>{round}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-white/35">结束条件</span>
              {([
                ["consensus", "达成共识"],
                ["no_new", "无新增观点"],
                ["reviewer", "Reviewer确认"],
              ] as Array<[DiscussionEndCondition, string]>).map(([condition, label]) => {
                const selected = endConditions.includes(condition);
                return (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setEndConditions((current) => selected ? current.filter((item) => item !== condition) : [...current, condition])}
                    className={cn("h-6 rounded border px-2 text-[10px]", selected ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-white/[0.06] text-white/35")}
                  >
                    {selected ? "✓ " : ""}{label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!input.trim() || selectedAgentIds.length === 0}
              onClick={() => void runRoundtable(input.trim())}
              className="h-8 w-full rounded-md bg-violet-500/20 px-3 text-[10px] text-violet-100 transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-35 md:ml-auto md:h-7 md:w-auto"
            >
              开始会议
            </button>
          </div>
        </div>
      )}

      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <DesktopChatView mode={mode} onReply={startReply} />
      </div>

      <div className="mobile-chat-body flex min-h-0 flex-1 flex-col md:hidden">
        <ProjectOverview />
        <CompactAgentBar />
        <div className="mx-3 divider-glass my-0.5" />
        <MobileWorkflowView mode={mode} onReply={startReply} />
      </div>

      <div className="mobile-chat-composer shrink-0 border-t border-ah-border p-2 md:p-3">
        {replyAgentId && mode === "discussion" && (
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-white/45">
            <Reply size={11} />
            回复 {agents.find((agent) => agent.id === replyAgentId)?.name ?? "员工"}
            <button type="button" onClick={() => setReplyAgentId(null)} className="rounded p-0.5 hover:bg-white/[0.06]" aria-label="取消回复"><X size={11} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {mode === "discussion" && (
            <button
              type="button"
              onClick={() => {
                setInput((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}@`);
                setMentionOpen(true);
                window.setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
              aria-label="选择员工"
              title="@员工"
            >
              <AtSign size={16} />
            </button>
          )}
          <div className="relative flex-1">
            {mentionOpen && mentionMatch && (
              <div className="absolute bottom-full left-0 z-30 mb-2 max-h-52 w-full overflow-y-auto rounded-lg border border-white/[0.09] bg-[#101117] p-1 shadow-2xl">
                {mentionCandidates.length > 0 ? mentionCandidates.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => chooseMention(agent)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>{agent.avatar}</span>
                    <span>{agent.name}</span>
                    <span className="ml-auto text-[10px] text-white/30">{agent.roleLabel}</span>
                  </button>
                )) : <div className="px-2.5 py-2 text-xs text-white/35">没有匹配的员工</div>}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                setInput(value);
                setMentionOpen(mode === "discussion" && /@[^@\s]*$/.test(value));
              }}
              placeholder={mode === "discussion" ? (roundtableOpen ? `输入会议主题，发送后由 ${selectedAgentIds.length} 名员工讨论...` : "和团队讨论想法，不会自动执行...") : "输入明确任务，提交后由 Controller 拆解执行..."}
              className="input-glass pr-10 text-base md:text-sm py-3 md:py-2.5"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setMentionOpen(false);
                  setRoundtableOpen(false);
                } else if (e.key === "Enter" && input.trim() && !mentionOpen) {
                  void handleSend();
                }
              }}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-1.5 rounded-lg text-ah-text-muted hover:text-ah-accent-purple transition-colors active:bg-ah-surface/20 disabled:opacity-35"
              onClick={() => { if (input.trim()) void handleSend(); }}
              disabled={sending}
              aria-label={roundtableOpen ? "开始会议" : "发送"}
            >
              <Send size={18} className="md:size-[14px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}