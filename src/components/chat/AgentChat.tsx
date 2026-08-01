"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { getAgentProfile } from "@/lib/agent-profiles";
import { getConstitution } from "@/constitution/data";
import { memoryRetrieval } from "@/memory/retrieval";
import { memorySummarizer } from "@/memory/summarizer";
import { getChatMessageChannel, useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import { orchestrator } from "@/controller/orchestrator";
import { cn } from "@/lib/utils";
import { adapterRegistry } from "@/adapters/registry";
import { AGENTHUB_HERMES_SOURCE, getAgentHubHermesSessionSource } from "@/lib/hermes-session";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";

interface Message {
  id: string;
  role: "user" | "agent" | "tool";
  content: string;
  timestamp: number;
  toolName?: string;
}

interface AgentChatProps {
  agentId: string;
  onBack: () => void;
}
interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  text: string;
  pageCount?: number;
  sheetCount?: number;
  sheetNames?: string[];
  characterCount: number;
  truncated: boolean;
}
const TASK_INTENT_PATTERN = /设计|生成|写|制作|规划|分析|调研|审核|整理|输出|创建|执行|方案|手册|报告|文案|页面|项目|任务|帮我做|做一个/;

function shouldExecuteAsControllerTask(agentId: string, text: string) {
  return agentId === "controller" && text.length >= 6 && TASK_INTENT_PATTERN.test(text);
}


export function AgentChat({ agentId, onBack }: AgentChatProps) {
  const storeMessages = useChatStore((state) => state.messages);
  const addChatMessage = useChatStore((state) => state.addMessage);
  const messages = useMemo<Message[]>(() => storeMessages
    .filter((msg) => msg.agentId === agentId && getChatMessageChannel(msg) === "private")
    .map((msg) => ({
      id: msg.id,
role: msg.role ?? (msg.type === "log" || msg.type === "system" || msg.id.startsWith("orch-") || msg.id.includes("-r-") || msg.id.includes("-a-") || msg.id === "m1" ? "agent" : "user"),
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date(msg.timestamp).getTime(),
      toolName: msg.toolName,
    })), [storeMessages, agentId]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = getAgentProfile(agentId);
  const constitution = getConstitution(agentId);
  const runtime = useAgentStore(s => s.runtimes.get(agentId));

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  if (!profile) return null;

  const statusLabel: Record<string, string> = {
    IDLE: "在线", THINKING: "思考中", WORKING: "工作中", DONE: "完成",
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body: formData });
      const payload = await response.json() as { ok?: boolean; file?: ChatAttachment; error?: string };
      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error ?? "文件解析失败");
      }
      setAttachment(payload.file);
    } catch (error) {
      setAttachment(null);
      setUploadError(error instanceof Error ? error.message : "文件上传失败");
    } finally {
      setUploading(false);
    }
  };
  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading || uploading) return;
    const text = input.trim() || "请分析这份文件";
    const activeAttachment = attachment;
    const attachmentContext = activeAttachment
      ? `\n\n# 用户附件\n文件名：${activeAttachment.name}\n类型：${activeAttachment.type}${activeAttachment.pageCount ? `\n页数：${activeAttachment.pageCount}` : ""}${activeAttachment.sheetCount ? `\n工作表：${activeAttachment.sheetCount} 个（${activeAttachment.sheetNames?.join("、") ?? ""}）` : ""}\n${activeAttachment.truncated ? "注意：附件内容较长，当前为前 50000 字符。\n" : ""}正文：\n${activeAttachment.text}`
      : "";
    const taskText = text + (activeAttachment
      ? `\n\n<agenthub_attachment name="${activeAttachment.name.replace(/"/g, "&quot;")}" type="${activeAttachment.type}">\ncontent:\n${attachmentContext}\n</agenthub_attachment>`
      : "");
    const displayText = activeAttachment ? `${text}\n\n附件：${activeAttachment.name}` : text;
    setInput("");
    setAttachment(null);
    setUploadError("");
    setLoading(true);

    // 用户消息
    addChatMessage({
      id: "chat-u-" + Date.now(), agentId, role: "user", channel: "private",
      content: displayText, type: "text", timestamp: new Date(),
    });
    memorySummarizer.learnFromUserMessage(agentId, text);

if (shouldExecuteAsControllerTask(agentId, text)) {
addChatMessage({
id: "chat-a-" + Date.now(), agentId, role: "agent", channel: "private",
content: "收到，我开始拆解并调度团队执行。执行日志会在这里同步。", type: "text", timestamp: new Date(),
});
setLoading(false);
void orchestrator.execute(taskText).catch((err: unknown) => {
const message = err instanceof Error ? err.message : String(err);
addChatMessage({
id: "chat-a-" + Date.now(), agentId, role: "agent", channel: "private",
content: "主控执行失败：" + message, type: "text", timestamp: new Date(),
});
});
return;
}

    // 检索 Memory
    const memCtx = memoryRetrieval.getRetrievalContext(agentId, taskText, "");

    // 构建 Agent 上下文
    const prompt = `# 角色
你是 ${profile.name}，${profile.title}。

# 工作原则
${constitution?.workingPrinciples.map(p => `- ${p}`).join("\n") ?? ""}

# 用户偏好
${constitution?.decisionHabits.map(h => `- ${h}`).join("\n") ?? ""}

# 相关记忆
${memCtx || "无"}

# 对话
用户：${taskText}

请用自然、友好的方式回复，像一个真实员工和老板对话。简洁直接。`;
    const responsePrompt = prompt + `

# Response format
Use concise Markdown with visible paragraph breaks.
Put each section heading on its own line.
Use bullet lists for findings and numbered lists for actions.
For analysis results, use this order: conclusion, exceptions, details, next action.
Do not put the whole response on one line and do not expose internal reasoning or memory lookup.`;


    try {
      const binding = adapterRegistry.getBinding(agentId);
      const directProvider = binding && ["openai", "claude", "deepseek", "custom"].includes(binding.provider);
      const endpoint = "/api/intelligence/runs";
      const requestBody = {
        input: responsePrompt,
        provider: directProvider ? binding.provider : "opencode-go",
      providerConfigId: binding?.providerConfigId,
        model: binding?.model ?? profile.model,
        apiUrl: directProvider ? binding.apiUrl : undefined,
        apiToken: directProvider ? binding.apiToken : undefined,
        source: AGENTHUB_HERMES_SOURCE,
        session_source: getAgentHubHermesSessionSource("private_chat", agentId),
        run_mode: "private_chat",
        timeout_ms: 90000,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(100000),
      });

      const data = await res.json();
      const resultContent = data?.result?.content;
      const output = data?.result?.text
        ?? (typeof resultContent === 'string' ? resultContent : resultContent ? JSON.stringify(resultContent) : undefined)
        ?? data?.output;
      const ok = res.ok && data?.ok !== false;
      const agentMsg: Message = {
        id: 'a-' + Date.now(), role: 'agent',
        content: ok ? (output ?? '收到。') : (data?.error ?? '抱歉，处理请求时出错了。'),
        timestamp: Date.now(),
      };
      addChatMessage({
        id: agentMsg.id, agentId, role: "agent", channel: "private",
        content: agentMsg.content, type: "text", timestamp: new Date(agentMsg.timestamp),
      });
      if (ok && agentMsg.content) {
        await memorySummarizer.updateAfterConversation(agentId, text, agentMsg.content);
      }

    } catch {
      addChatMessage({
        id: "chat-a-" + Date.now(), agentId, role: "agent", channel: "private",
        content: "网络请求失败，请稍后重试。", type: "text", timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const status = runtime?.internalStatus ?? "IDLE";

  return (
    <div className="h-full min-h-0 flex flex-col pb-[env(safe-area-inset-bottom)]">
      {/* 头部 */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-[#0a0a0c]">
        <button type="button" onClick={onBack} aria-label="返回项目监控" title="返回项目监控" className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/75">
          <ArrowLeft size={15} />
          <span>监控</span>
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}88)` }}>
          {profile.name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-white/85">{profile.name}</span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status !== "IDLE" && status !== "DONE" ? "#10b981" : "#71717a" }} />
            <span className="text-[9px] text-white/30">{statusLabel[status] ?? "在线"}</span>
          </div>
          <p className="text-[9px] text-white/25">{profile.title} · {profile.model}</p>
        </div>
      </div>

      {/* 消息区 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-white/15 text-xs py-8">
            💬 开始和 {profile.name} 对话
          </div>
        )}
        {messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "")}
          >
            {msg.role !== "user" && (
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}88)` }}>
                {profile.name.slice(0, 1)}
              </div>
            )}
            <div className={cn(
              "max-w-[75%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed",
              msg.role === "user"
                ? "bg-purple-500 text-white rounded-br-md"
                : "bg-white/[0.04] border border-white/[0.06] text-white/75 rounded-bl-md"
            )}>
              {msg.role === "user" ? <span className="whitespace-pre-wrap">{msg.content}</span> : <MarkdownMessage content={msg.content} />}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-purple-500/20 shrink-0 flex items-center justify-center text-[10px] text-purple-400">
                周
              </div>
            )}
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}88)` }}>
              {profile.name.slice(0, 1)}
            </div>
            <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06]">
              <Loader2 size={14} className="animate-spin text-white/30" />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="shrink-0 sticky bottom-0 z-20 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-white/[0.08] bg-[#0a0a0c]/95 backdrop-blur-xl">
{agentId === "controller" && (
          <>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json" className="hidden" onChange={handleFileChange} />
            {attachment && (
              <div className="mb-2 flex items-center gap-2 rounded-md border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2">
                <FileText size={15} className="shrink-0 text-cyan-300/75" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-medium text-white/72">{attachment.name}</div>
                  <div className="mt-0.5 text-[9px] text-white/35">
                    {attachment.type}{attachment.pageCount ? ` · ${attachment.pageCount} 页` : ""}{attachment.sheetCount ? ` · ${attachment.sheetCount} 个工作表` : ""} · {attachment.characterCount.toLocaleString()} 字符
                    {attachment.truncated ? " · 已截取前 50000 字符" : ""}
                  </div>
                </div>
                <button type="button" onClick={() => setAttachment(null)} aria-label="移除附件" title="移除附件" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/35 hover:bg-white/[0.06] hover:text-white/70"><X size={14} /></button>
              </div>
            )}
            {uploadError && <div className="mb-2 rounded-md border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2 text-[10px] leading-5 text-rose-300/80">{uploadError}</div>}
          </>
        )}
        <div className="flex items-center gap-2">
          {agentId === "controller" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              aria-label="上传项目附件"
              title="上传 PDF、Word、Excel 或文本文件"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
          )}
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={attachment ? "输入希望项目经理如何处理该文件..." : `和 ${profile.name} 说点什么...`}
            className="min-w-0 flex-1 input-glass text-sm py-2.5"
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || loading || uploading}
            aria-label="发送消息"
            title="发送"
            className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
