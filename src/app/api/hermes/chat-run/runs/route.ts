import { NextRequest, NextResponse } from "next/server";

import { AGENTHUB_HERMES_PROFILE, AGENTHUB_HERMES_SOURCE } from "@/lib/hermes-session";

const HERMES_API_BASE = process.env.HERMES_API_URL ?? "http://127.0.0.1:8080";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.HERMES_API_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const runMode = "run_mode" in body ? String(body.run_mode) : "runtime";
  const { run_mode: _runMode, ...forwardBody } = body as Record<string, unknown>;
  void _runMode;
  const isolatedBody = {
    ...forwardBody,
    provider: "opencode-go",
    profile: runMode === "planning"
      ? process.env.AGENTHUB_HERMES_CONTROLLER_PROFILE ?? "agenthub-controller"
      : process.env.AGENTHUB_HERMES_PROFILE ?? AGENTHUB_HERMES_PROFILE,
    source: AGENTHUB_HERMES_SOURCE,
  };
  const timeoutMs = typeof body.timeout_ms === "number" ? body.timeout_ms : 60000;
  const upstreamController = new AbortController();
  const timeout = setTimeout(
    () => upstreamController.abort(new DOMException("Hermes proxy timeout", "TimeoutError")),
    Math.min(Math.max(timeoutMs + 5000, 15000), 185000),
  );
  const abortUpstream = () => upstreamController.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortUpstream, { once: true });

  let response: Response;
  try {
    response = await fetch(`${HERMES_API_BASE}/api/chat-run/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify(isolatedBody),
      signal: upstreamController.signal,
    });
  } catch (error) {
    const abortedByClient = request.signal.aborted;
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: abortedByClient ? "Request cancelled" : "Hermes request timed out", detail: message },
      { status: abortedByClient ? 499 : 504 },
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortUpstream);
  }

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error?: unknown }).error)
      : text || response.statusText;
    const hint = response.status === 401 && !token
      ? "Hermes requires auth. Set HERMES_API_TOKEN on the AgentHub server."
      : undefined;
    return NextResponse.json({ ok: false, error, hint, hermesStatus: response.status }, { status: response.status });
  }

  return NextResponse.json(payload);
}