# Mock Dev Pipeline (Planner → Developer → Reviewer)

A fully offline, reproducible development-style pipeline: plan → implement → review,
with **zero API keys and zero network calls**.

## Flow

```
controller (需求拆解 + 方案规划)
   ↓
dev-1      (代码实现)   → code sketch / implementation notes
   ↓
reviewer-1 (质量审核)   → review verdict + fixes
```

## What runs here

| Agent | Step | Produces |
|---|---|---|
| `controller` | Plan | task breakdown + implementation plan (orchestrator layer) |
| `dev-1` | Implement | simulated code sketch via Mock runtime |
| `reviewer-1` | Review | quality verdict via the Supervisor quality gate |

Execution uses the **built-in Mock runtime** only. No terminal, no compiler, no external
service is invoked; the Mock adapter simulates the execution lifecycle
(received → context load → rule check → thinking → tool call → output → completed).

## Expected input

```
title: "Sketch a README badge component for the dashboard"
priority: high
assignedBy: controller
```

## Expected output structure

Identical `ExecutionResult` shape to the content pipeline:

```ts
{
  taskId: string;
  agentId: "controller" | "dev-1" | "reviewer-1";
  success: boolean;          // true for mock runs
  output: string;            // simulated deliverable text
  timeline: TimelineEntry[]; // full execution phases
  toolCalls: number;
  totalDurationMs: number;
  startedAt: number;
  completedAt: number;
}
```

## How to run — no API keys needed

### Option A: automated (recommended)

```bash
npm test
```

`tests/mock-pipelines.test.ts` executes this exact flow (content pipeline) and the
runtime-engine tests cover the dev-style dispatch (research/content in parallel).

### Option B: manual in the UI

1. `npm install`, `cp .env.example .env.local` (fill any two values)
2. `npm run dev`, open http://localhost:3099
3. Create a new project, set every agent to the **Mock** runtime
4. Submit the task and watch the timeline

## Constraints

- No Hermes, no Codex, no OpenAI, no external servers.
- The fixture `workflow.json` follows the node/edge model of the workflow canvas
  (`src/stores/workflowStore.ts`). Canvas JSON import is planned; until it ships,
  use the fixture as configuration reference or recreate the nodes manually.