import { NextRequest, NextResponse } from "next/server";
import { getProviderSecret } from "@/lib/server/provider-config-store";

type DirectProvider = "openai" | "claude" | "deepseek" | "custom";

interface ChatRequestBody {
  input?: unknown;
  provider?: unknown;
  providerConfigId?: unknown;
  model?: unknown;
  apiUrl?: unknown;
  apiToken?: unknown;
  timeout_ms?: unknown;
}

const DEFAULT_ENDPOINTS: Record<Exclude<DirectProvider, "custom">, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/messages",
  deepseek: "https://api.deepseek.com/chat/completions",
};

export const dynamic = "force-dynamic";

function resolveEndpoint(provider: DirectProvider, value: string): URL {
  const raw = value.trim() || (provider === "custom" ? "" : DEFAULT_ENDPOINTS[provider]);
  if (!raw) throw new Error("自定义 Provider 必须填写 API 地址");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("API 地址必须使用 HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
    throw new Error("API 地址不能指向本机或内网地址");
  }
  if (provider === "custom" && !url.pathname.includes("/chat/completions")) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  }
  return url;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as ChatRequestBody | null;
  if (!body || typeof body.input !== "string" || !body.input.trim()) {
    return NextResponse.json({ ok: false, error: "缺少对话内容" }, { status: 400 });
  }

let provider = String(body.provider ?? "") as DirectProvider;
  let model = typeof body.model === "string" ? body.model.trim() : "";
  let apiToken = typeof body.apiToken === "string" ? body.apiToken.trim() : "";
  let apiUrl = typeof body.apiUrl === "string" ? body.apiUrl : "";
  const providerConfigId = typeof body.providerConfigId === "string" ? body.providerConfigId.trim() : "";
  if (providerConfigId) {
    const managed = await getProviderSecret(providerConfigId);
    if (!managed) return NextResponse.json({ ok: false, error: "选择的 API 服务不存在或未启用" }, { status: 400 });
    provider = managed.kind === "opencode-go" || managed.kind === "custom" ? "custom" : managed.kind;
    model = model || managed.defaultModel;
    apiToken = managed.apiKey;
    apiUrl = managed.baseUrl;
  }
  if (!["openai", "claude", "deepseek", "custom"].includes(provider)) {
    return NextResponse.json({ ok: false, error: "不支持的 Provider" }, { status: 400 });
  }
  if (!model || !apiToken) {
    return NextResponse.json({ ok: false, error: "模型 ID 和 API Token 不能为空" }, { status: 400 });
  }

  try {
    const endpoint = resolveEndpoint(provider, apiUrl);
    const timeoutMs = Math.min(Math.max(Number(body.timeout_ms) || 90000, 10000), 120000);
    const isClaude = provider === "claude";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isClaude) {
      headers["x-api-key"] = apiToken;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(isClaude
        ? { model, max_tokens: 4096, messages: [{ role: "user", content: body.input }] }
        : { model, messages: [{ role: "user", content: body.input }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await upstream.json().catch(() => null) as Record<string, unknown> | null;
    if (!upstream.ok) {
      const detail = payload && "error" in payload ? JSON.stringify(payload.error) : upstream.statusText;
      return NextResponse.json({ ok: false, error: `${provider} API ${upstream.status}: ${detail}` }, { status: upstream.status });
    }

    const output = isClaude
      ? ((payload?.content as Array<{ text?: string }> | undefined)?.map((item) => item.text ?? "").join("\n") ?? "")
      : ((payload?.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content ?? "");
    if (!output) return NextResponse.json({ ok: false, error: "模型未返回文本结果" }, { status: 502 });
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /Timeout|timed out|超时/i.test(message) ? 504 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
