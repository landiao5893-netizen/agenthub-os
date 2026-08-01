import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { HERMES_RUNTIME_VERSION, type IntelligenceRunRequest, type IntelligenceRunResponse } from "./types";

function resolveRuntimeHome(): string | null {
  const configured = process.env.HERMES_RUNTIME_HOME?.trim();
  const bundled = path.join(process.cwd(), ".runtime", "hermes-agent");
  if (configured && existsSync(path.join(configured, "run_agent.py"))) return configured;
  if (existsSync(path.join(bundled, "run_agent.py"))) return bundled;
  return null;
}

function resolvePython(runtimeHome: string): string {
  const configured = process.env.HERMES_PYTHON?.trim();
  if (configured) return configured;
  const candidates = process.platform === "win32"
    ? [path.join(runtimeHome, "venv", "Scripts", "python.exe"), "python"]
    : [path.join(runtimeHome, "venv", "bin", "python"), "python3"];
  return candidates.find((candidate) => candidate === "python" || candidate === "python3" || existsSync(candidate)) ?? candidates.at(-1)!;
}

export async function runEmbeddedIntelligence(request: IntelligenceRunRequest): Promise<IntelligenceRunResponse> {
  const runtimeHome = resolveRuntimeHome();
  if (!runtimeHome) {
    return { ok: false, error: "AgentHub 内置智能引擎尚未安装", runtime_version: HERMES_RUNTIME_VERSION };
  }

  const worker = path.join(process.cwd(), "scripts", "hermes-embedded-worker.py");
  if (!existsSync(worker)) {
    return { ok: false, error: "内置智能引擎桥接文件缺失", runtime_version: HERMES_RUNTIME_VERSION };
  }

  const timeoutMs = Math.min(Math.max(request.timeout_ms ?? 90000, 15000), 185000);
  const python = resolvePython(runtimeHome);

  return new Promise((resolve) => {
    const child = spawn(python, [worker], {
      cwd: process.cwd(),
      env: { ...process.env, HERMES_RUNTIME_HOME: runtimeHome, PYTHONUNBUFFERED: "1" },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (payload: IntelligenceRunResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, error: "智能引擎执行超时", runtime_version: HERMES_RUNTIME_VERSION });
    }, timeoutMs + 5000);

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => finish({ ok: false, error: `智能引擎启动失败：${error.message}`, runtime_version: HERMES_RUNTIME_VERSION }));
    child.on("close", () => {
      const line = stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).at(-1);
      if (!line) {
        finish({ ok: false, error: `智能引擎未返回结果${stderr ? `：${stderr.slice(-300)}` : ""}`, runtime_version: HERMES_RUNTIME_VERSION });
        return;
      }
      try {
        finish(JSON.parse(line) as IntelligenceRunResponse);
      } catch {
        finish({ ok: false, error: "智能引擎返回格式异常", runtime_version: HERMES_RUNTIME_VERSION });
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
