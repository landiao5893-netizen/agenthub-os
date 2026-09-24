# AgentHub OS

AgentHub OS is an open-source control plane for managing, coordinating, and monitoring multiple AI agents from one interface.

It provides a unified workspace for agent runtimes, workflow orchestration, monitoring, memory, task routing, and quality control.

[中文文档](README.zh-CN.md)

---

## Why AgentHub OS

Developers often run different AI agents across separate terminals, chat windows, runtimes, and provider tools. AgentHub OS aims to provide one control plane for:

- agent management
- task routing
- workflow orchestration
- runtime integration
- monitoring
- memory
- quality control
- failure recovery
- developer automation

Instead of juggling several agents in several windows, you get a single dashboard where agents are organized like a team: each agent has its own profile, context, runtime, and status, and the controller routes work between them.

## Screenshots

### Dashboard

![Dashboard](docs/images/dashboard.png)

### Workflow Canvas

![Workflow Canvas](docs/images/workflow.png)

### Login

![Login](docs/images/login.png)

## Features

- **Multi-agent dashboard** — switch between agents, each with its own configuration and context; built-in role templates (controller, research, content, design, developer, reviewer).
- **Multi-agent chat** — direct and group conversations with Markdown rendering and file preview.
- **Agent status monitoring** — live idle / working / waiting states and task execution timelines.
- **Provider configuration** — API keys encrypted server-side (AES); supports OpenAI, Claude, DeepSeek, and any OpenAI-compatible endpoint.
- **Workflow canvas** — drag-and-drop visual orchestration of agents, task nodes, and knowledge documents.
- **Controller / orchestration** — automatic task decomposition, parallel dispatch, and result synthesis.
- **Supervisor / quality control** — outputs scored across five dimensions (completeness, accuracy, task fit, constitution, preference) with PASS / WARN / FAIL gates and failure-recovery tracking.
- **Memory** — per-agent persistent memory that survives across sessions.
- **Shared workspace** — artifacts from one agent are available as context to downstream agents.
- **Knowledge extraction** — upload documents and extract text into a searchable knowledge base.

## Supported and Planned Runtimes

AgentHub OS is designed to support multiple agent runtimes and developer tools, including integrations or adapters for Codex, Hermes, and OpenClaw.

| Runtime | Status |
|---|---|
| Hermes Agent | ✅ Implemented — chat-run, image and video generation API routes, embedded Python worker |
| Generic LLM | ✅ Implemented — OpenAI-compatible chat completion |
| Mock | ✅ Implemented — offline execution for development and demos |
| OpenClaw | 🔧 Foundation — early adapter with a basic task-execution surface |
| Codex | 🚧 Planned — no dedicated adapter yet |

## Architecture

```
UI Layer (React / Next.js)
        ↓
Controller / Orchestrator   → task decomposition, parallel dispatch, synthesis
        ↓
Supervisor / Quality Control → 5-dimension scoring, PASS/WARN/FAIL, recovery
        ↓
Runtime Adapter Layer       → unified execution entry
        ↓
Hermes / OpenClaw / LLM / Mock runtimes
```

Sidecar components: memory, shared workspace, monitoring, provider configuration, logging/event engine, task state.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details and per-layer implementation status.

## Quick Start

Prerequisites: Node.js 18+ and npm.

```bash
git clone https://github.com/landiao5893-netizen/agenthub-os.git
cd agenthub-os
npm install
cp .env.example .env.local
# edit .env.local and fill in the required values
npm run dev
```

Open http://localhost:3099

> The login password and session secret are **required** — the server refuses to start without `AGENTHUB_PASSWORD` and `AGENTHUB_SESSION_SECRET`.

## Configuration

- Providers are configured in the settings panel (OpenAI-compatible endpoints: base URL + API key + model list).
- API keys are encrypted at rest by the server (`data/` directory, git-ignored).
- Hermes runtime connection can be configured per agent with an API URL and token.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AGENTHUB_PASSWORD` | ✅ | Login password for the dashboard |
| `AGENTHUB_SESSION_SECRET` | ✅ | Session secret (recommend a random string of 32+ chars) |
| `HERMES_API_TOKEN` | — | Token for the Hermes runtime API |
| `AGENTHUB_IMAGE_API_URL` | — | Image generation API base URL |
| `AGENTHUB_IMAGE_API_TOKEN` | — | Image generation API token |
| `AGENTHUB_IMAGE_MODEL` | — | Image generation model name |

In production, also set `AGENTHUB_COOKIE_SECURE=true` to force the `Secure` cookie attribute.

## Project Structure

```
src/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # React components (agents, chat, workflow, monitor, supervisor, runtime…)
├── controller/       # task decomposition + multi-agent orchestration
├── supervisor/       # quality gating + failure recovery
├── runtime-engine/   # unified execution entry + runtime adapters
├── adapters/         # adapter registry (Hermes, OpenClaw, LLM, Mock)
├── intelligence/     # orchestration intelligence layer
├── memory/           # per-agent persistent memory
├── workspace/        # shared workspace and artifact downloads
├── knowledge/        # knowledge base and document parsing
├── constitution/     # agent behavioral guidelines
├── stores/           # Zustand client state
└── lib/              # shared logic and server-side configuration
```

## Security

- API keys are encrypted at rest (AES) and never logged; the UI only shows a last-4-characters hint.
- Password verification uses timing-safe comparison; sessions use an HMAC-SHA256 signed cookie.
- Server-side routes that call external providers validate target hosts and block localhost and private network ranges (SSRF mitigation).
- Never commit secrets, private endpoints, or personal configuration. See [SECURITY.md](SECURITY.md) and [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md) for current, next, and future work. Highlights: standardized runtime adapter interface, Codex integration, permission controls for agent actions, secret isolation, audit logs, and more tests.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide (bug reports, feature requests, documentation, runtime and provider integrations, PR process).

## License

[MIT](LICENSE)

## Project Status

AgentHub OS is an early-stage open-source project under active development.