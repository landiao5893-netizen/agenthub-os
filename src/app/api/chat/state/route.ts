import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isAgentHubAuthenticated } from "@/lib/server-auth";
import type { ChatMessage } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATA_DIR = process.env.AGENTHUB_DATA_DIR ?? path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "chat-state.json");
const MAX_MESSAGES = 600;
const MAX_CONTENT_LENGTH = 200000;

type StoredMessage = Omit<ChatMessage, "timestamp"> & { timestamp: string };
type ChatState = {
  version: 1;
  revision: number;
  updatedAt: string;
  messages: StoredMessage[];
};

let writeQueue: Promise<unknown> = Promise.resolve();

function inferChannel(message: Pick<StoredMessage, "id" | "channel">): "discussion" | "execution" | "private" {
  if (message.channel === "discussion" || message.channel === "execution" || message.channel === "private") return message.channel;
  if (message.id.startsWith("group-")) return "discussion";
  if (message.id.startsWith("chat-u-") || message.id.startsWith("chat-a-") || message.id.startsWith("a-") || message.id === "m1") return "private";
  return "execution";
}

function sanitizeMessages(value: unknown): StoredMessage[] {
  if (!Array.isArray(value)) return [];
  const seen = new Map<string, StoredMessage>();
  value.slice(-MAX_MESSAGES * 2).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const candidate = item as Partial<StoredMessage>;
    const id = String(candidate.id ?? "").trim().slice(0, 160);
    const agentId = String(candidate.agentId ?? "").trim().slice(0, 80);
    const content = String(candidate.content ?? "").slice(0, MAX_CONTENT_LENGTH);
    const parsedTimestamp = new Date(String(candidate.timestamp ?? ""));
    if (!id || !agentId || !content || Number.isNaN(parsedTimestamp.getTime())) return;
    const timestamp = parsedTimestamp.toISOString();
    const type = ["text", "tool_call", "log", "system"].includes(String(candidate.type))
      ? candidate.type as StoredMessage["type"]
      : "text";
    const role = ["user", "agent", "tool"].includes(String(candidate.role))
      ? candidate.role as StoredMessage["role"]
      : undefined;
    const message: StoredMessage = {
      id,
      agentId,
      content,
      type,
      role,
      channel: inferChannel({ id, channel: candidate.channel }),
      timestamp,
      toolName: candidate.toolName ? String(candidate.toolName).slice(0, 160) : undefined,
      toolResult: candidate.toolResult ? String(candidate.toolResult).slice(0, MAX_CONTENT_LENGTH) : undefined,
    };
    const existing = seen.get(id);
    if (!existing || existing.timestamp <= message.timestamp) seen.set(id, message);
  });
  return [...seen.values()]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-MAX_MESSAGES);
}

function mergeMessages(current: StoredMessage[], incoming: StoredMessage[]): StoredMessage[] {
  return sanitizeMessages([...current, ...incoming]);
}

async function readState(): Promise<ChatState | null> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ChatState;
    if (parsed.version !== 1 || !Array.isArray(parsed.messages)) return null;
    return { ...parsed, messages: sanitizeMessages(parsed.messages) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeState(state: ChatState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = STATE_PATH + "." + process.pid + ".tmp";
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tempPath, STATE_PATH);
}

export async function GET(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const state = await readState();
    return NextResponse.json(state ? { ok: true, initialized: true, state } : { ok: true, initialized: false, revision: 0 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to read chat state" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { messages?: unknown } | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  const incoming = sanitizeMessages(body.messages);

  const operation = writeQueue.then(async () => {
    const current = await readState();
    const messages = mergeMessages(current?.messages ?? [], incoming);
    const state: ChatState = {
      version: 1,
      revision: (current?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      messages,
    };
    await writeState(state);
    return NextResponse.json({ ok: true, initialized: true, state });
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  try {
    return await operation;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save chat state" }, { status: 500 });
  }
}
