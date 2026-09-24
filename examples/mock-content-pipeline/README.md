# Mock Content Pipeline (Research → Content → Reviewer)

A fully offline, reproducible multi-agent pipeline that demonstrates AgentHub OS core
orchestration with **zero API keys and zero network calls**.

## Flow

```
controller (需求分析)
   ↓
research-1 (竞品调研)   → facts summary
   ↓
content-1 (内容初稿)   → draft text
   ↓
reviewer-1 (质量审核)  → quality verdict + fixes
```

## What runs here

| Agent | Step | Produces |
|---|---|---|
| `research-1` | Research | structured facts summary (Mock output) |
| `content-1` | Draft | article draft from the research context |
| `reviewer-1` | Review | quality verdict through the Supervisor quality gate |
| `controller` | Planning | task decomposition (orchestrator layer) |

All agents execute through the **built-in Mock runtime**
(`src/runtime-engine/adapters/mock.ts`), which simulates the full execution lifecycle
(received → context load → rule check → thinking → tool call → output → completed)
without any external service.

## Expected input

One task specification, e.g. in the UI Canvas or through the runtime engine:

```
title: "Write a short introduction for the Guizhou Collection launch page"
priority: medium
assignedBy: controller
```

## Expected output structure

Each agent produces an `ExecutionResult`:

```ts
{
  taskId: string;
  agentId: "research-1" | "content-1" | "reviewer-1";
  success: boolean;          // true for mock runs
  output: string;            // simulated deliverable text
  timeline: TimelineEntry[]; // received/context_load/rule_check/thinking/tool_call/executing/output/completed
  toolCalls: number;         // ≥ 0, mock-incremented when a granted tool step is hit
  totalDurationMs: number;
  startedAt: number;
  completedAt: number;
}
```

The workflow fixture `workflow.json` mirrors the canvas node/edge model used by
`src/stores/workflowStore.ts`.

## How to run — no API keys needed

### Option A: automated (recommended, ~15 s)

```bash
npm test                       # runs tests/mock-pipelines.test.ts, which executes this exact 3-agent flow offline
```

### Option B: manual in the UI

1. `npm install` then `cp .env.example .env.local` (fill any two values)
2. `npm run dev`, open http://localhost:3099
3. Create a new project, choose the **Mock** runtime for each agent
4. Submit the task above and watch the timeline

## Constraints

- No Hermes, no Codex, no OpenAI, no image/video APIs, no external server.
- The mock-machinery never calls `fetch` (verified in `tests/mock-runtime.test.ts`).