import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

import { deleteProvider, getProviderSecret, listProviders, saveProvider, updateProviderModels } from "@/lib/server/provider-config-store";
import { isAgentHubAuthenticated } from "@/lib/server-auth";
import type { ManagedProviderKind, ManagedProviderUsage } from "@/types/provider-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS = new Set<ManagedProviderKind>(["opencode-go", "openai", "claude", "deepseek", "custom"]);
const USAGES = new Set<ManagedProviderUsage>(["text", "image", "video"]);

function safeBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("API 地址必须使用 HTTPS");
  const host = url.hostname.toLowerCase();
  const ipType = isIP(host);
  if (host === "localhost" || host.endsWith(".local") || host === "::1" || host === "127.0.0.1" || (ipType === 4 && /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))) {
    throw new Error("API 地址不能指向本机或内网");
  }
  return url;
}

function modelsEndpoint(baseUrl: string): URL {
  const url = safeBaseUrl(baseUrl);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = /\/chat\/completions$|\/messages$|\/responses$|\/images\/generations$|\/videos(?:\/generations)?$/.test(path)
    ? path.replace(/\/(chat\/completions|messages|responses|images\/generations|videos(?:\/generations)?)$/, "/models")
    : `${path}/models`;
  return url;
}

async function discoverModels(providerId: string): Promise<string[]> {
  const provider = await getProviderSecret(providerId);
  if (!provider) throw new Error("Provider 不存在或未启用");
  if (!provider.apiKey) throw new Error("请先填写 API KEY");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (provider.kind === "claude") {
    headers["x-api-key"] = provider.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }
  const response = await fetch(modelsEndpoint(provider.baseUrl), { headers, signal: AbortSignal.timeout(20000) });
  const payload = await response.json().catch(() => null) as { data?: Array<{ id?: string }>; models?: Array<{ id?: string }>; error?: unknown } | null;
  if (!response.ok) throw new Error(`模型服务 ${response.status}: ${JSON.stringify(payload?.error ?? response.statusText).slice(0, 240)}`);
  const entries = payload?.data ?? payload?.models ?? [];
  const models = Array.from(new Set(entries.map((item) => String(item.id ?? "").trim()).filter(Boolean))).sort();
  if (!models.length) throw new Error("连接成功，但服务没有返回模型列表");
  return models;
}

export async function GET(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await listProviders()) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "读取 Provider 失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  const kind = String(body.kind ?? "") as ManagedProviderKind;
  const usage = String(body.usage ?? "") as ManagedProviderUsage;
  const name = String(body.name ?? "").trim();
  const baseUrl = String(body.baseUrl ?? "").trim();
  if (!name || !KINDS.has(kind) || !USAGES.has(usage) || !baseUrl) return NextResponse.json({ ok: false, error: "名称、类型、用途和 API 地址不能为空" }, { status: 400 });
  try {
    safeBaseUrl(baseUrl);
    const result = await saveProvider({
      id: typeof body.id === "string" ? body.id : undefined,
      name,
      kind,
      usage,
      baseUrl,
      apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
      models: Array.isArray(body.models) ? body.models.map(String) : undefined,
      defaultModel: typeof body.defaultModel === "string" ? body.defaultModel : undefined,
      enabled: body.enabled !== false,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "保存 Provider 失败" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "缺少 Provider ID" }, { status: 400 });
  try {
    const models = await discoverModels(id);
    const provider = await updateProviderModels(id, models);
    return NextResponse.json({ ok: true, models, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: /401|403/.test(message) ? 401 : 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ ok: false, error: "缺少 Provider ID" }, { status: 400 });
  await deleteProvider(id);
  return NextResponse.json({ ok: true });
}

