import { NextRequest, NextResponse } from "next/server";
import { AGENTHUB_SESSION_COOKIE, getAgentHubSessionToken, verifyAgentHubPassword } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!verifyAgentHubPassword(password)) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AGENTHUB_SESSION_COOKIE, getAgentHubSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.AGENTHUB_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
