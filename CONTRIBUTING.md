# Contributing to AgentHub OS

Thank you for your interest in AgentHub OS! This project is in an early but actively maintained stage, and contributions of any size are welcome.

## Project Overview

AgentHub OS is an open-source control plane for managing, coordinating, and monitoring multiple AI agents from one interface. It provides a unified workspace for agent runtimes, workflow orchestration, monitoring, memory, task routing, and quality control.

The codebase is a Next.js 14 (App Router) application written in TypeScript. Key modules live under `src/`:

- `src/controller/` — task decomposition and multi-agent orchestration
- `src/supervisor/` — quality gating and failure recovery
- `src/runtime-engine/` — unified task execution across runtime adapters
- `src/adapters/` — provider/runtime adapter registry (Hermes, OpenClaw, LLM, Mock)
- `src/memory/` — per-agent persistent memory
- `src/workspace/` — shared workspace and artifacts
- `src/stores/` — Zustand client state

## Ways to Contribute

### Bug Reports

- Open an issue with a clear title and description.
- Include steps to reproduce, expected behavior, and actual behavior.
- Mention your environment (OS, Node version, browser).

### Feature Requests

- Describe the problem you want to solve and why.
- Propose a solution sketch if you have one.
- Keep scope realistic for an early-stage project.

### Documentation Improvements

- Fix typos, outdated statements, or unclear instructions.
- Keep every claim consistent with the actual code — do not document features that do not exist.
- Improvements to `README.md`, `README.zh-CN.md`, and `docs/` are appreciated.

### Runtime Integrations

- AgentHub OS is designed for multiple runtimes (currently Hermes and OpenClaw adapters exist; a generic LLM adapter is available).
- When adding or improving a runtime adapter, follow the existing adapter interface in `src/runtime-engine/adapters/` and `src/adapters/`.

### Provider Integrations

- Providers are OpenAI-compatible API endpoints configured via the settings panel and stored server-side with encrypted API keys.
- If you add provider support, make sure credentials are handled through the existing secret store (`src/lib/server/provider-config-store.ts`), never hardcoded.

### Workflow Examples

- Reusable multi-agent workflow examples are a planned and welcome addition.
- Examples must not contain real credentials, private endpoints, or proprietary business data.

## Local Development

Prerequisites: Node.js 18+ and npm.

```bash
git clone https://github.com/landiao5893-netizen/agenthub-os.git
cd agenthub-os
npm install
cp .env.example .env.local
# edit .env.local and fill in the required values
npm run dev
```

The development server runs at http://localhost:3099.

Required environment variables (see `.env.example`):

- `AGENTHUB_PASSWORD` — login password for the dashboard
- `AGENTHUB_SESSION_SECRET` — random secret, at least 32 characters

Optional:

- `HERMES_API_TOKEN` — token for the Hermes runtime API
- `AGENTHUB_IMAGE_API_URL` / `AGENTHUB_IMAGE_API_TOKEN` / `AGENTHUB_IMAGE_MODEL` — image generation backend

### Build and lint

```bash
npm run build
npm run lint
```

If lint reports issues, prefer fixing them in a focused way over large refactors; if a rule or configuration is the problem, raise it in the issue tracker.

## Pull Request Process

1. Fork the repository and create a branch: `git checkout -b fix/your-change`.
2. Make focused changes with clear commit messages.
3. Run `npm run build` and, when applicable, `npm run lint` locally and report the results in the PR description.
4. Open a pull request against `main`.
5. Reference any related issue (e.g. `Closes #12`).
6. Keep the PR reviewable: one logical change per PR, prefer smaller PRs.

## Commit Guidelines

- Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Write concise, descriptive commit messages.
- Do not commit generated files, build output, logs, or credentials.

## Security Rules

Read `SECURITY.md` before contributing.

- Never commit API keys, tokens, passwords, cookies, private endpoints, or personal configuration.
- Secrets belong in `.env.local` (ignored by git) or in the server-side encrypted provider store.
- If you discover a vulnerability, follow the responsible disclosure process in `SECURITY.md` — do not post exploit details in public issues.

## Code Review Expectations

- Reviewers check for correctness, security, and consistency with existing code style.
- Changes that touch authentication, secret handling, or agent execution paths receive extra scrutiny.
- Be respectful and constructive in reviews; explain the "why" behind requested changes.