# Security Policy

AgentHub OS is a control plane that manages AI agents. It handles API credentials, provider configuration, agent runtimes, automated task execution, sessions, workflows, and external providers. Security is a primary concern of this project.

## Supported Versions

AgentHub OS is in an early stage (current release: v0.1.0). Only the latest release on the `main` branch receives active security attention.

| Version | Supported |
|---|---|
| v0.1.x (latest) | ✅ |
| Earlier versions | ❌ |

## Reporting a Vulnerability

Please report vulnerabilities privately using **GitHub Private Vulnerability Reporting** (Security tab of the repository) if it is available for this repository.

If private reporting is not available, contact the maintainer through GitHub before disclosing sensitive details publicly. Do not open a public issue for a suspected vulnerability.

When reporting, include:

- Affected version(s) and commit(s)
- Steps to reproduce or a proof of concept
- Impact assessment
- Suggested fix, if you have one

## Sensitive Information

Never post any of the following in public issues, pull requests, or discussions:

- API keys and tokens
- Passwords
- Cookies and session values
- Private endpoints or internal server addresses
- Exploit details
- Sensitive logs (request bodies, auth headers, provider responses)

If you accidentally expose a credential, rotate it immediately and report the exposure privately.

## Security Scope

The security model covers:

- **API credentials** — provider API keys are encrypted at rest (AES) in `data/provider-state.json` with a local key file; `data/` is git-ignored.
- **Provider configuration** — user-configured providers, base URLs, and model lists.
- **Agent runtimes** — Hermes, OpenClaw, and generic LLM runtime adapters.
- **Automated task execution** — task routing, orchestration, and tool execution paths.
- **Authentication and session** — password login with HMAC-signed session cookie (`src/lib/server-auth.ts`).
- **Workflow execution** — workflow state and multi-agent coordination.
- **External providers** — outbound requests to configured LLM/image/video APIs.

## Secret Handling

- `.env.example` contains placeholder values only; real secrets belong in `.env.local` (git-ignored).
- Provider API keys entered through the settings UI are encrypted server-side before being written to disk.
- Never hardcode secrets in source files, examples, documentation, or tests.
- Never commit `.env`, `.env.local`, `data/`, logs, or build artifacts.

## Runtime Integrations

Runtime adapters execute tasks on behalf of agents and may call remote services. Treat runtime endpoints as untrusted inputs, and restrict the set of runtimes and endpoints an agent can reach.

## External Providers

Requests to third-party providers are handled by the server-side API routes, which validate target hosts (blocking localhost and private network ranges, including `10.*`, `127.*`, `169.254.*`, `192.168.*`, and `172.16–31.*`) to mitigate SSRF. Review provider configuration before adding one.

## Agent Actions

Agents can trigger orchestration, memory access, workspace artifacts, and runtime execution. A future permission system is planned (see `docs/SECURITY_MODEL.md`); until it exists, treat agent actions as trusted-user-initiated only.

## Authentication and Session

- The login password is verified with a timing-safe comparison.
- The session cookie is an HMAC-SHA256 token derived from `AGENTHUB_SESSION_SECRET`.
- Set `AGENTHUB_COOKIE_SECURE=true` in production to force the `Secure` cookie attribute.

## Dependency Security

- Keep `npm audit` findings in mind when reviewing PRs that change dependencies.
- Pin meaningful versions in `package.json`; `package-lock.json` is committed.
- The `xlsx` dependency is pulled from the official SheetJS CDN per upstream guidance.

## Responsible Disclosure

We aim to respond to private reports within a reasonable time. Please:

- Give maintainers time to fix and release before public disclosure.
- Do not test vulnerabilities against production systems you do not own.
- Share details only with the maintainer through the private channel.