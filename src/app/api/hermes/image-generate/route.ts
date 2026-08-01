import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { runEmbeddedIntelligence } from "@/intelligence/embedded-runtime";
import { getDefaultProvider } from "@/lib/server/provider-config-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const ARTIFACT_ROOT = process.env.AGENTHUB_ARTIFACT_ROOT ?? path.join(process.cwd(), ".data", "artifacts");

function safeSegment(value: unknown, fallback: string) {
  const normalized = String(value ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 80) || fallback;
}

function apiUrl(base: string, endpoint: string) {
  const normalized = base.replace(/\/+$/, "");
  if (normalized.endsWith("/v1")) return normalized + endpoint.replace(/^\/v1/, "");
  return normalized + endpoint;
}

interface RawHttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

function rawRequest(urlValue: string, options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs: number }): Promise<RawHttpResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(urlValue);
    const transport = target.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(target, {
      method: options.method ?? "GET",
      headers: options.headers,
    }, (response) => {
      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > 30 * 1024 * 1024) {
          request.destroy(new Error("图片响应超过 30MB 限制"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode ?? 500,
          statusText: response.statusMessage ?? "",
          headers: response.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    request.setTimeout(options.timeoutMs, () => request.destroy(new Error("图片 API 请求超时")));
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function generateWithDirectProvider(prompt: string, outputPath: string) {
  const managed = await getDefaultProvider("image");
  const baseUrl = managed?.baseUrl ?? process.env.AGENTHUB_IMAGE_API_URL;
  const token = managed?.apiKey ?? process.env.AGENTHUB_IMAGE_API_TOKEN;
  if (!baseUrl || !token) return null;

  const requestBody = JSON.stringify({
    model: managed?.defaultModel ?? process.env.AGENTHUB_IMAGE_MODEL ?? "agnes-image-2.1-flash",
    prompt: prompt.slice(0, 5000),
    n: 1,
    size: "1024x1024",
    stream: false,
  });
  const response = await rawRequest(apiUrl(baseUrl, "/v1/images/generations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(requestBody)),
      Authorization: "Bearer " + token,
    },
    body: requestBody,
    timeoutMs: 90000,
  });

  let payload: {
    data?: Array<{ b64_json?: string | null; url?: string | null }>;
    error?: { message?: string } | string;
  } = {};
  const raw = response.body.toString("utf-8");
  try {
    payload = raw ? JSON.parse(raw) as typeof payload : {};
  } catch {
    payload = { error: raw };
  }

  if (response.status < 200 || response.status >= 300) {
    const detail = typeof payload.error === "string" ? payload.error : payload.error?.message;
    throw new Error("图片 API " + response.status + ": " + (detail || raw || response.statusText).slice(0, 300));
  }

  const result = payload.data?.[0];
  if (result?.b64_json) {
    await writeFile(outputPath, Buffer.from(result.b64_json, "base64"));
    return "direct";
  }
  if (result?.url) {
    const imageResponse = await rawRequest(result.url, { timeoutMs: 30000 });
    if (imageResponse.status < 200 || imageResponse.status >= 300) {
      throw new Error("图片文件下载失败：" + imageResponse.status);
    }
    await writeFile(outputPath, imageResponse.body);
    return "direct";
  }
  throw new Error("图片 API 未返回图片数据");
}
async function generateWithEmbeddedIntelligence(prompt: string, outputPath: string) {
  const result = await runEmbeddedIntelligence({
    input: prompt.slice(0, 5000),
    run_mode: "image_generation",
    provider: process.env.AGENTHUB_MODEL_PROVIDER ?? "opencode-go",
    model: process.env.AGENTHUB_MODEL_NAME ?? "deepseek-v4-flash",
    session_source: "agenthub_os_image_generation",
    instructions: "Create the requested visual asset. Use the image tool and produce a polished, usable PNG without extra files.",
    artifact_output_path: outputPath,
    artifact_root_path: ARTIFACT_ROOT,
    timeout_ms: 120000,
  });
  if (!result.ok) throw new Error(result.error ?? "图片生成服务失败");
  return "agenthub-intelligence";
}

export async function POST(request: NextRequest) {
  let body: { prompt?: unknown; projectId?: unknown; entryId?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求内容不是有效 JSON" }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "缺少图片生成提示词" }, { status: 400 });
  }

  const projectId = safeSegment(body.projectId, "project");
  const entryId = safeSegment(body.entryId, "design");
  const baseName = safeSegment(body.name, "design-preview");
  const fileName = baseName + "-" + Date.now() + ".png";
  const projectDir = path.join(ARTIFACT_ROOT, projectId);
  const outputPath = path.join(projectDir, fileName);
  await mkdir(projectDir, { recursive: true });

  try {
    const provider = await generateWithDirectProvider(prompt, outputPath)
      ?? await generateWithEmbeddedIntelligence(prompt, outputPath);
    const fileStat = await stat(outputPath);

    return NextResponse.json({
      ok: true,
      artifact: {
        id: "artifact-" + entryId + "-" + Date.now(),
        name: fileName,
        kind: "image",
        mimeType: "image/png",
        size: fileStat.size,
        url: "/api/artifacts/" + encodeURIComponent(projectId) + "/" + encodeURIComponent(fileName),
        createdAt: Date.now(),
      },
      provider,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "图片生成超时"
      : error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}