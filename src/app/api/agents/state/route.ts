import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isAgentHubAuthenticated } from "@/lib/server-auth";
import type { AgentConfig, AgentRole } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATA_DIR = process.env.AGENTHUB_DATA_DIR ?? path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "agent-state.json");
const MAX_AGENTS = 100;
const VALID_ROLES = new Set<AgentRole>(["controller", "research", "content", "design", "developer", "reviewer", "analyst"]);

type AgentState = {
  version: 1;
  revision: number;
  updatedAt: string;
  agents: AgentConfig[];
  archivedAgents: AgentConfig[];
};

let writeQueue: Promise<unknown> = Promise.resolve();

function sanitizeAgents(value: unknown): AgentConfig[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, MAX_AGENTS).flatMap((item): AgentConfig[] => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<AgentConfig>;
    const id = String(candidate.id ?? "").trim().slice(0, 80);
    const name = String(candidate.name ?? "").trim().slice(0, 120);
    if (!id || !name || seen.has(id) || !VALID_ROLES.has(candidate.role as AgentRole)) return [];
    seen.add(id);
    return [{
      id,
      name,
      role: candidate.role as AgentRole,
      roleLabel: String(candidate.roleLabel ?? "").slice(0, 120),
      model: String(candidate.model ?? "").slice(0, 120),
      skills: Array.isArray(candidate.skills) ? candidate.skills.map(String).slice(0, 30) : [],
      tools: Array.isArray(candidate.tools) ? candidate.tools.map(String).slice(0, 30) : [],
      avatar: String(candidate.avatar ?? "").slice(0, 40),
      color: String(candidate.color ?? "#8b5cf6").slice(0, 40),
    }];
  });
}

async function readState(): Promise<AgentState | null> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AgentState;
    if (parsed.version !== 1 || !Array.isArray(parsed.agents) || !Array.isArray(parsed.archivedAgents)) return null;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeState(state: AgentState): Promise<void> {
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
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to read agent state" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    expectedRevision?: unknown;
    agents?: unknown;
    archivedAgents?: unknown;
  } | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  const agents = sanitizeAgents(body.agents);
  const archivedAgents = sanitizeAgents(body.archivedAgents).filter((agent) => !agents.some((active) => active.id === agent.id));
  if (!agents.some((agent) => agent.id === "controller")) {
    return NextResponse.json({ ok: false, error: "Controller is required" }, { status: 400 });
  }

  const operation = writeQueue.then(async () => {
    const current = await readState();
    const currentRevision = current?.revision ?? 0;
    const expectedRevision = Number(body.expectedRevision ?? currentRevision);
    if (Number.isFinite(expectedRevision) && expectedRevision !== currentRevision) {
      return NextResponse.json({ ok: false, conflict: true, state: current }, { status: 409 });
    }
    const state: AgentState = {
      version: 1,
      revision: currentRevision + 1,
      updatedAt: new Date().toISOString(),
      agents,
      archivedAgents,
    };
    await writeState(state);
    return NextResponse.json({ ok: true, initialized: true, state });
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  try {
    return await operation;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save agent state" }, { status: 500 });
  }
}
