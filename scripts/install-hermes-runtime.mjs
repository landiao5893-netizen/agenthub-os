import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const TAG = "v2026.7.20";
const root = process.cwd();
const runtimeRoot = path.join(root, ".runtime");
const target = path.join(runtimeRoot, "hermes-agent");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

mkdirSync(runtimeRoot, { recursive: true });

if (!existsSync(path.join(target, ".git"))) {
  run("git", ["clone", "--depth", "1", "--branch", TAG, "https://github.com/NousResearch/hermes-agent.git", target]);
} else {
  run("git", ["fetch", "origin", "tag", TAG, "--depth", "1"], target);
  run("git", ["checkout", "--detach", TAG], target);
}

const python = process.env.HERMES_BOOTSTRAP_PYTHON || (process.platform === "win32" ? "python" : "python3");
const venvPython = process.platform === "win32"
  ? path.join(target, "venv", "Scripts", "python.exe")
  : path.join(target, "venv", "bin", "python");

if (!existsSync(venvPython)) run(python, ["-m", "venv", "venv"], target);
run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], target);
run(venvPython, ["-m", "pip", "install", "-e", ".[all]"], target);

console.log(`AgentHub Intelligence Runtime ${TAG} installed at ${target}`);
