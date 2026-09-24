# AgentHub OS Architecture

This document describes the logical architecture of AgentHub OS as it exists in the codebase. Status labels are applied honestly:

- **Implemented** — real, working code paths
- **Foundation** — core pieces exist, but the surface is not complete (e.g. limited adapters, no permission checks)
- **In development / Planned** — not present in the code yet

## Layer overview

```
┌─────────────────────────────────────┐
│            UI Layer                 │  Next.js App Router pages + React components
│  dashboard · chat · canvas · panels │
└───────────────┬─────────────────────┘
                ▼
┌─────────────────────────────────────┐
│     Controller / Orchestrator       │  task decomposition → parallel dispatch → synthesis
│   src/controller/ (Implemented)     │
└───────────────┬─────────────────────┘
                ▼
┌─────────────────────────────────────┐
│   Supervisor / Quality Control      │  5-dimension scoring, PASS/WARN/FAIL, recovery
│    src/supervisor/ (Implemented)    │
└───────────┬─────────────┬───────────┘
            ▼             ▼
┌─────────────────────────────────────┐
│        Runtime Adapter Layer        │  unified execution entry
│  src/runtime-engine/ (Implemented)  │
└───────────┬─────────────┬───────────┘
            ▼             ▼
┌─────────────────────────────────────┐
│   Codex / Hermes / OpenClaw / ...   │  external runtimes & LLM providers
│   Hermes/OpenClaw: Foundation        │
│   Codex: Planned (no adapter yet)    │
└─────────────────────────────────────┘
```

## Layer responsibilities

### UI Layer (Implemented)

React components in `src/app/` (pages) and `src/components/` (reusable UI):

- Multi-agent chat (`chat/MultiAgentChat.tsx`, `chat/AgentChat.tsx`)
- Workflow canvas (`workflow/SmartWorkflowCanvas.tsx`)
- Agent management (`agents/AgentTeam.tsx`, `agents/AgentProfile.tsx`, `agents/AgentCreateDialog.tsx`)
- Monitoring panels (`monitor/TaskMonitor.tsx`, `monitor/RightPanel.tsx`)
- Runtime panel and execution timeline (`runtime/AgentRuntimePanel.tsx`, `runtime/ExecutionTimeline.tsx`)
- Settings (`settings/ProviderSettingsPanel.tsx`)
- Client state via Zustand stores in `src/stores/`

### Controller / Orchestrator (Implemented)

`src/controller/orchestrator.ts` decomposes a user request into subtasks, dispatches them in parallel to agents through the runtime layer, and synthesizes results. `src/controller/real-llm.ts` performs task analysis through a configured LLM; `mock-llm.ts` is the offline fallback.

### Supervisor / Quality Control (Implemented)

`src/supervisor/engine.ts` supervises agent execution, tracks quality scores and recovery attempts. `src/supervisor/quality-gate.ts` scores each output across five dimensions (completeness, accuracy, task fit, constitution, preference) and emits **PASS / WARN / FAIL**. Failure recovery exists in foundation form (retry attempt tracking); a full retry policy is future work.

### Runtime Adapter Layer (Implemented, foundation for breadth)

`src/runtime-engine/engine.ts` is the unified execution entry: it builds context, selects an adapter per agent, executes the task, and records a timeline.

Adapters (`src/runtime-engine/adapters/` and `src/adapters/`):

| Adapter | Status | Notes |
|---|---|---|
| Hermes | Foundation | communicates with a Hermes Agent runtime endpoint |
| OpenClaw | Foundation | early adapter (basic task execution surface) |
| Generic LLM | Implemented | OpenAI-compatible chat completion via `/api/llm/chat` |
| Mock | Implemented | offline execution for demos and development |

The older `src/adapters/` registry (BaseAdapter/Hermes/OpenClaw/DirectLLM/Mock) overlaps with `src/runtime-engine/adapters/`; unifying them under one interface is on the roadmap.

### Runtimes & External systems

- **Hermes** — wiring exists (`src/app/api/hermes/*`, `runtime/hermes-runtime.json`, `scripts/install-hermes-runtime.mjs`, `scripts/hermes-embedded-worker.py`). Foundation.
- **OpenClaw** — adapter exists; integration depth is early. Foundation.
- **Codex** — **no adapter exists** in the code. Planned.
- **LLM providers** — OpenAI-compatible endpoints configured by the user; API keys are encrypted server-side. Implemented.

## Sidecar components

| Component | Location | Status |
|---|---|---|
| Memory (per-agent, persistent) | `src/memory/` | Implemented (localStorage-backed, 120 entries/agent cap) |
| Shared Workspace (artifacts, downloads) | `src/workspace/` + `/api/artifacts` | Implemented |
| Monitoring & task timeline | `src/components/monitor/`, `src/app/api/agents/state` | Implemented |
| Provider configuration | `src/lib/server/provider-config-store.ts` (AES-encrypted keys) | Implemented |
| Event engine (logging) | `src/lib/event-engine.ts` | Implemented |
| Knowledge extraction | `src/knowledge/`, `/api/documents/extract` | Implemented |
| Task state persistence | Zustand stores + local storage | Foundation (no server-side persistence) |
| Permission system for agent actions | — | Planned (see `SECURITY_MODEL.md`) |
| Audit logs | — | Planned |

## Request flow example

1. User submits a project request in the chat UI.
2. `MultiAgentOrchestrator` plans the task via the intelligence layer (real LLM or mock).
3. Subtasks are dispatched through `runtimeEngine.executeTask()`.
4. Each adapter runs the task against its runtime and returns a result.
5. `SupervisorEngine` scores outputs (quality gate) and records recovery attempts.
6. Results are synthesized and surfaced in the UI timeline and workspace.