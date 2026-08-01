import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const AGENTHUB_SESSION_COOKIE = "ah_session";
const PASSWORD = process.env.AGENTHUB_PASSWORD ?? "agenthub2026";
const SESSION_SECRET = process.env.AGENTHUB_SESSION_SECRET ?? PASSWORD + ":agenthub-session";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAgentHubPassword(value: string): boolean {
  return safeEqual(value, PASSWORD);
}

export function getAgentHubSessionToken(): string {
  return createHmac("sha256", SESSION_SECRET).update("agenthub-os-session-v1").digest("hex");
}

export function isAgentHubAuthenticated(request: NextRequest): boolean {
  const value = request.cookies.get(AGENTHUB_SESSION_COOKIE)?.value ?? "";
  return safeEqual(value, getAgentHubSessionToken());
}
