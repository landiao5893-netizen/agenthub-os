# AgentHub OS Security Model

Status note: this project is early-stage. Several items below are documented as **Planned** or **Recommended**; nothing is described as existing unless it exists in the code.

## 1. Threat model

AgentHub OS manages AI agents, API credentials, and automated workflows. The main threats are:

- **Credential leakage** — API keys, session secrets, or tokens exposed via source, logs, or artifacts
- **Unsafe tool execution** — an agent executes an action with unintended side effects
- **Prompt injection** — untrusted input steers an agent or model into harmful behavior
- **Untrusted model output** — model output containing instructions that a human or agent then follows
- **Runtime abuse** — a runtime endpoint used beyond its intended purpose
- **Over-permissioned actions** — agents able to reach resources they should not
- **Sensitive log exposure** — request bodies or headers (with tokens) written into logs
- **Third-party provider risk** — a configured provider endpoint that is malicious or compromised

## 2. Secret handling

**Implemented**

- Provider API keys are encrypted at rest with AES (`src/lib/server/provider-config-store.ts`); the key file lives in `data/.provider-secrets.key`, and `data/` is git-ignored.
- The UI only ever surfaces an API-key hint (last 4 characters).
- Required secrets come from environment variables (`AGENTHUB_PASSWORD`, `AGENTHUB_SESSION_SECRET`); `.env.example` contains placeholders only.
- `.gitignore` covers `.env*`, `data/`, logs, and build artifacts.

**Rules (apply to all contributions)**

- Never commit real secrets, private endpoints, or personal configuration.
- Never log authorization headers or API keys.
- Rotate any credential that has ever appeared in a public context.

## 3. Runtime permission boundaries

**Foundation / Planned**

- The runtime layer (`src/runtime-engine/`) isolates runtimes per agent at the code level, but there is **no OS-level sandbox** for runtime processes today.
- Planned: per-runtime permission policies (which hosts, which tools, which workspace paths).
- Recommended before deploying in a multi-tenant way: run runtimes in isolated containers.

## 4. Agent action permissions

**Planned**

There is currently no fine-grained permission system for agent actions (which agent may call which tool or which endpoint). Until it exists:

- Treat agent execution as trusted-user-initiated.
- Do not expose the app to untrusted users with agents that can execute privileged actions.
- A permission policy engine is on the roadmap.

## 5. Session security

**Implemented**

- Password verification uses timing-safe comparison (`crypto.timingSafeEqual`, `src/lib/server-auth.ts`).
- The session token is an HMAC-SHA256 value derived from `AGENTHUB_SESSION_SECRET`.
- In production, set `AGENTHUB_COOKIE_SECURE=true` to force the `Secure` cookie attribute.
- Recommend `AGENTHUB_SESSION_SECRET` be a random string of at least 32 characters.

## 6. External provider risk

**Implemented mitigations**

- Server-side routes that call provider endpoints validate the target host and reject localhost and private network ranges (`10.*`, `127.*`, `169.254.*`, `192.168.*`, `172.16–31.*`) to reduce SSRF.
- Provider configuration is user-supplied; validate base URLs and model lists before use.

**Remaining risk**

- A compromised or malicious provider endpoint could send crafted responses; treat provider output as untrusted model output.

## 7. Prompt injection risk

**Open / mitigations**

- Agents build prompts from user input, memory, and workspace content. Malicious content in any of these could steer model behavior.
- Current mitigations are minimal (structured task framing in `src/runtime-engine/prompt-engine.ts` and `context-builder.ts`).
- Recommended: treat all external content as untrusted; clearly delimit instructions from data in prompts; restrict tool use to a whitelist.

## 8. Tool execution risk

**Open**

- Agents execute tasks through runtime adapters; the concrete actions depend on the external runtime (Hermes/OpenClaw/LLM).
- The app itself does not yet gate tool calls or require human approval for agent actions.
- Recommended: human approval gates for any action with side effects (file writes, network calls to production, purchases).
- Planned: audit log of all tool executions.

## 9. Secrets exposure

**Process**

- This project ran a repository-wide scan for secrets and private data before its first public release; findings were removed from tracking (see `OPEN_SOURCE_AUDIT.md`).
- GitHub Private Vulnerability Reporting should be used for vulnerability reports (see `SECURITY.md`).
- If a real secret is found in the repository, rotate it immediately and report privately.

## 10. Logging risk

**Currently**

- The client-side event engine (`src/lib/event-engine.ts`) logs events; task outputs appear in the UI timeline.
- No structured server-side logging of request bodies is implemented.

**Rules**

- Never log authorization headers, cookies, or raw API keys.
- Redact secrets in any future server-side logging.
- Review changed event/timeline logging for sensitive payloads.

## 11. Human approval gates

**Planned**

There is no approval flow for agent actions yet. Recommended design:

- All state-changing or externally visible agent actions require explicit human confirmation.
- Approval UI integrated into the task timeline.
- Allowlist of safe actions that skip approval (read-only queries).

## 12. Future sandboxing

**Planned**

- Container or VM isolation for runtime processes
- Filesystem restrictions for workspace access
- Network egress filtering for runtime pods
- Per-agent resource limits (tokens, time, memory)
- Capability-based permission engine with deny-by-default