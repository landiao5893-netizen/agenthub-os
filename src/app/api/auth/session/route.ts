import { NextRequest, NextResponse } from "next/server";
import { isAgentHubAuthenticated } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true, authenticated: isAgentHubAuthenticated(request) });
}
