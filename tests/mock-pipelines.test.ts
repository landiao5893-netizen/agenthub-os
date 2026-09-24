import { describe, it, expect } from "vitest";
import { runtimeEngine } from "@/runtime-engine/engine";
import { qualityGate } from "@/supervisor/quality-gate";
import type { ExecutionTask, ExecutionResult } from "@/runtime-engine/types";

// Mirrors examples/mock-content-pipeline/workflow.json:
// controller(plan) -> research-1 -> content-1 -> reviewer-1 (quality gate).
// Runs entirely on the built-in Mock runtime; no external API is contacted.

function makeTask(id: string, title: string, input: string): ExecutionTask {
  return {
    id,
    title,
    description: "Offline example pipeline task",
    input,
    priority: "medium",
    assignedBy: "controller",
  };
}

async function collect(agentId: string, task: ExecutionTask): Promise<ExecutionResult> {
  return runtimeEngine.executeTask(agentId, task);
}

describe("examples/mock-content-pipeline — offline 3-agent flow", () => {
  it(
    "runs research -> content -> review end-to-end and gates the final output",
    async () => {
      runtimeEngine.setDefaultType("mock");
      runtimeEngine.setAgentType("research-1", "mock");
      runtimeEngine.setAgentType("content-1", "mock");
      runtimeEngine.setAgentType("reviewer-1", "mock");

      // Step 1: research
      const research = await collect(
        "research-1",
        makeTask(
          "pipeline-research",
          "Research Guizhou Collection competitors",
          "Produce a facts summary with pricing and positioning.",
        ),
      );
      expect(research.success).toBe(true);
      expect(research.timeline.some((e) => e.phase === "completed")).toBe(true);

      // Step 2: content draft consumes the research context
      const draft = await collect(
        "content-1",
        makeTask(
          "pipeline-draft",
          "Draft launch intro for Guizhou Collection",
          `Use this research: ${research.output.slice(0, 200)}`,
        ),
      );
      expect(draft.success).toBe(true);

      // Step 3: reviewer quality-gates the draft (offline scoring)
      const gate = qualityGate.evaluate(
        "reviewer-1",
        "Reviewer Agent",
        "Review launch intro draft",
        draft.output,
        `Draft to review:\n${draft.output}`,
      );
      expect(gate.dimensions).toHaveLength(5);

      // Mock output may not be a polished article, so the gate verdict may be
      // PASS or WARN — but it must be a real, computed verdict, never undefined.
      expect(["PASS", "WARN", "FAIL"]).toContain(gate.status);
      expect(typeof gate.totalScore).toBe("number");

      // Full chain synthesized + reviewed
      const chain = [research.output, draft.output, gate.feedback].join("\n\n");
      expect(chain.length).toBeGreaterThan(0);
    },
    60000,
  );
});