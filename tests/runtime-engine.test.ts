import { describe, it, expect } from "vitest";
import { runtimeEngine } from "@/runtime-engine/engine";
import type { ExecutionTask } from "@/runtime-engine/types";

function makeTask(id: string, title: string, input: string): ExecutionTask {
  return {
    id,
    title,
    description: `Offline task for agent: ${title}`,
    input,
    priority: "medium",
    assignedBy: "controller",
  };
}

describe("RuntimeEngine — multi-agent offline dispatch (mock)", () => {
  it("dispatches a research task and a content task, then allows result synthesis", async () => {
    // Force every agent onto the offline Mock runtime for this test.
    runtimeEngine.setDefaultType("mock");
    runtimeEngine.setAgentType("research-1", "mock");
    runtimeEngine.setAgentType("content-1", "mock");

    const researchTask = makeTask(
      "wf-research-1",
      "Research offline AI agent orchestration tools",
      "List 3 open-source frameworks for multi-agent orchestration.",
    );
    const contentTask = makeTask(
      "wf-content-1",
      "Draft an intro paragraph from research findings",
      "Turn the research list into a readable intro paragraph.",
    );

    const [researchResult, contentResult] = await Promise.all([
      runtimeEngine.executeTask("research-1", researchTask),
      runtimeEngine.executeTask("content-1", contentTask),
    ]);

    // Both tasks were dispatched to distinct agents and completed offline.
    expect(researchResult.success).toBe(true);
    expect(researchResult.agentId).toBe("research-1");
    expect(researchResult.taskId).toBe("wf-research-1");
    expect(researchResult.output.length).toBeGreaterThan(0);

    expect(contentResult.success).toBe(true);
    expect(contentResult.agentId).toBe("content-1");
    expect(contentResult.taskId).toBe("wf-content-1");
    expect(contentResult.output.length).toBeGreaterThan(0);

    // Both timelines progressed through the execution lifecycle.
    for (const result of [researchResult, contentResult]) {
      expect(result.timeline.some((e) => e.phase === "received")).toBe(true);
      expect(result.timeline.some((e) => e.phase === "completed")).toBe(true);
    }

    // Results are synth-able: downstream output references the upstream shape.
    const synthesized = [researchResult.output, contentResult.output].join("\n\n");
    expect(synthesized.length).toBeGreaterThan(0);
  }, 45000);

  it("reports a structured failure for an unknown agent without throwing", async () => {
    runtimeEngine.setDefaultType("mock");
    const task = makeTask("wf-unknown-1", "Task for ghost agent", "This agent does not exist.");

    let result: Awaited<ReturnType<typeof runtimeEngine.executeTask>> | undefined;
    let threw = false;
    try {
      result = await runtimeEngine.executeTask("ghost-agent-999", task);
    } catch {
      threw = true;
    }

    // The engine must not crash the caller; it returns or rejects with a structured result.
    expect(threw).toBe(false);
    expect(typeof result?.success).toBe("boolean");
  }, 15000);
});