import { NextRequest, NextResponse } from "next/server";

import { runEmbeddedIntelligence } from "@/intelligence/embedded-runtime";
import { getProviderSecret } from "@/lib/server/provider-config-store";
import type { IntelligenceRunRequest } from "@/intelligence/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(nextRequest: NextRequest) {
  const body = await nextRequest.json().catch(() => null) as IntelligenceRunRequest | null;
  if (!body?.input?.trim()) {
    return NextResponse.json({ ok: false, error: "任务内容不能为空" }, { status: 400 });
  }

  let resolvedBody = body;
  if (body.providerConfigId) {
    const provider = await getProviderSecret(body.providerConfigId);
    if (!provider) return NextResponse.json({ ok: false, error: "选择的 API 服务不存在或未启用" }, { status: 400 });
    if (!provider.apiKey) return NextResponse.json({ ok: false, error: "选择的 API 服务尚未配置 KEY" }, { status: 400 });
    resolvedBody = {
      ...body,
      provider: provider.kind === "custom" ? "openai" : provider.kind === "claude" ? "anthropic" : provider.kind,
      model: body.model || provider.defaultModel,
      apiUrl: provider.baseUrl,
      apiToken: provider.apiKey,
    };
  }

  const result = await runEmbeddedIntelligence(resolvedBody);
  const clarificationRequested = /CLARIFY_REQUESTED|需要补充|请求澄清/i.test(result.error ?? "");
  if (clarificationRequested) {
    const question = (result.error ?? "请补充任务信息").replace(/^CLARIFY_REQUESTED:\s*/i, "");
    return NextResponse.json({ ...result, error: question, output: question }, { status: 409 });
  }
  const status = result.ok ? 200 : /超时/.test(result.error ?? "") ? 504 : 503;
  return NextResponse.json(result, { status });
}
