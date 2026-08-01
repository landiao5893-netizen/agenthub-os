import { isIP } from "node:net";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { getDefaultProvider, getProviderSecret } from "@/lib/server/provider-config-store";
import { isAgentHubAuthenticated } from "@/lib/server-auth";
import type { WorkspaceArtifact } from "@/workspace/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const ARTIFACT_ROOT = path.resolve(process.env.AGENTHUB_ARTIFACT_ROOT ?? path.join(process.cwd(), ".data", "artifacts"));
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

type VideoPayload = Record<string, unknown>;

function safeHttpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("视频服务必须使用 HTTPS");
  const host = url.hostname.toLowerCase();
  const ipType = isIP(host);
  if (host === "localhost" || host.endsWith(".local") || host === "::1" || host === "127.0.0.1" || (ipType === 4 && /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))) {
    throw new Error("视频地址不能指向本机或内网");
  }
  return url;
}

function videoEndpoint(baseUrl: string): URL {
  const url = safeHttpsUrl(baseUrl);
  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = /\/videos(?:\/generations)?$/.test(pathname) ? pathname : `${pathname}/videos`;
  return url;
}

function textField(payload: VideoPayload, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function resultUrl(payload: VideoPayload): string {
  const direct = textField(payload, ["url", "video_url", "remixed_from_video_id", "download_url"]);
  if (direct) return direct;
  for (const key of ["data", "output", "result"]) {
    const nested = payload[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const value = resultUrl(nested as VideoPayload);
      if (value) return value;
    }
  }
  return "";
}

function dimensions(aspectRatio: string): { width: number; height: number } {
  if (aspectRatio === "9:16") return { width: 720, height: 1280 };
  if (aspectRatio === "1:1") return { width: 768, height: 768 };
  return { width: 1280, height: 720 };
}

async function parsePayload(response: Response): Promise<VideoPayload> {
  const payload = await response.json().catch(() => null);
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as VideoPayload : {};
}

async function downloadVideo(remoteUrl: string, targetPath: string): Promise<number> {
  safeHttpsUrl(remoteUrl);
  const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`视频下载失败：HTTP ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_VIDEO_BYTES) throw new Error("视频文件超过 250MB 限制");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("视频服务返回了空文件");
  if (bytes.length > MAX_VIDEO_BYTES) throw new Error("视频文件超过 250MB 限制");
  await fs.writeFile(targetPath, bytes);
  return bytes.length;
}

export async function POST(request: NextRequest) {
  if (!isAgentHubAuthenticated(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    prompt?: unknown;
    projectId?: unknown;
    entryId?: unknown;
    name?: unknown;
    providerConfigId?: unknown;
    imageUrl?: unknown;
    aspectRatio?: unknown;
    duration?: unknown;
  } | null;
  const prompt = String(body?.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ ok: false, error: "缺少视频提示词" }, { status: 400 });

  try {
    const providerId = String(body?.providerConfigId ?? "").trim();
    const provider = providerId ? await getProviderSecret(providerId) : await getDefaultProvider("video");
    if (!provider || !provider.apiKey) throw new Error("尚未配置可用的视频生成 API");
    const endpoint = videoEndpoint(provider.baseUrl);
    const aspectRatio = String(body?.aspectRatio ?? "16:9");
    const duration = Math.max(5, Math.min(18, Number(body?.duration) || 5));
    const frameRate = 24;
    const numFrames = Math.min(441, Math.max(121, Math.round((duration * frameRate - 1) / 8) * 8 + 1));
    const createBody: Record<string, unknown> = {
      model: provider.defaultModel || provider.models[0] || "agnes-video-v2.0",
      prompt,
      ...dimensions(aspectRatio),
      num_frames: numFrames,
      frame_rate: frameRate,
    };
    const imageUrl = String(body?.imageUrl ?? "").trim();
    if (imageUrl) createBody.image = safeHttpsUrl(imageUrl).toString();

    const headers = { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json", Accept: "application/json" };
    const createResponse = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(createBody), signal: AbortSignal.timeout(30000) });
    let payload = await parsePayload(createResponse);
    if (!createResponse.ok) throw new Error(`视频服务 ${createResponse.status}：${textField(payload, ["error", "message", "detail"]) || createResponse.statusText}`);

    let remoteUrl = resultUrl(payload);
    const taskId = textField(payload, ["task_id", "video_id", "id"]);
    if (!remoteUrl && !taskId) throw new Error("视频服务未返回任务 ID");

    const deadline = Date.now() + 270000;
    while (!remoteUrl && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const pollUrl = new URL(`${endpoint.toString().replace(/\/+$/, "")}/${encodeURIComponent(taskId)}`);
      const pollResponse = await fetch(pollUrl, { headers, signal: AbortSignal.timeout(20000) });
      payload = await parsePayload(pollResponse);
      if (!pollResponse.ok) throw new Error(`视频状态查询失败：HTTP ${pollResponse.status}`);
      const status = textField(payload, ["status", "state"]).toLowerCase();
      if (["failed", "error", "cancelled", "canceled"].includes(status)) {
        throw new Error(textField(payload, ["error", "message", "detail"]) || "视频生成失败");
      }
      remoteUrl = resultUrl(payload);
    }
    if (!remoteUrl) throw new Error("视频生成超时，请稍后重试");

    const projectId = String(body?.projectId ?? "current").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "current";
    const baseName = String(body?.name ?? "generated-video").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "generated-video";
    const fileName = `${baseName}-${Date.now()}.mp4`;
    const targetDir = path.join(ARTIFACT_ROOT, projectId);
    const targetPath = path.join(targetDir, fileName);
    await fs.mkdir(targetDir, { recursive: true });
    const size = await downloadVideo(remoteUrl, targetPath);

    const artifact: WorkspaceArtifact = {
      id: `artifact-video-${Date.now()}`,
      name: fileName,
      kind: "video",
      mimeType: "video/mp4",
      url: `/api/artifacts/${encodeURIComponent(projectId)}/${encodeURIComponent(fileName)}`,
      size,
      createdAt: Date.now(),
    };
    return NextResponse.json({ ok: true, artifact, entryId: String(body?.entryId ?? ""), provider: provider.name, model: createBody.model });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "视频生成失败" }, { status: 502 });
  }
}
