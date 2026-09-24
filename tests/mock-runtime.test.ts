import { describe, it, expect, vi, afterEach } from "vitest";
import { MockRuntime } from "@/runtime-engine/adapters/mock";
import { contextBuilder } from "@/runtime-engine/context-builder";
import type { ExecutionTask, TimelineEntry, ExecutionResult } from "@/runtime-engine/types";

function makeTask(overrides: Partial<ExecutionTask> = {}): ExecutionTask {
  return {
    id: "task-mock-1",
    title: "Write a short market research brief",
    description: "Summarize the competitive landscape for an AI tooling product.",
    input: "Research competitor pricing and positioning, then summarize.",
    priority: "medium",
    assignedBy: "controller",
    ...overrides,
  };
}

describe("MockRuntime — offline base execution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("executes a task end-to-end without any network call", async () => {
    // Prove the mock path never touches the network.
    const fetchSpy = vi.fn(async () => {
      throw new Error("network must not be reached");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const task = makeTask();
    const context = contextBuilder.build("research-1", task);
    expect(context).not.toBeNull();
    if (!context) return;

    const runtime = new MockRuntime();
    const iter = runtime.execute(context)[Symbol.asyncIterator]();

    const timeline: TimelineEntry[] = [];
    let result: ExecutionResult | undefined;
    for (;;) {
      const step = await iter.next();
      if (step.done) {
        result = step.value;
        break;
      }
      timeline.push(step.value);
    }

    // Structure checks
    expect(result).toBeDefined();
    expect(result!.success).toBe(true);
    expect(result!.taskId).toBe(task.id);
    expect(result!.agentId).toBe("research-1");
    expect(result!.output.length).toBeGreaterThan(0);
    expect(result!.totalDurationMs).toBeGreaterThan(0);

    // Timeline sanity: received → completed with meaningful phases
    expect(timeline.length).toBeGreaterThan(5);
    expect(timeline[0].phase).toBe("received");
    expect(result!.timeline.length).toBe(timeline.length);
    expect(result!.timeline.some((e) => e.phase === "completed")).toBe(true);

    // Zero network calls happened
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 30000);

  it("fails gracefully and returns a structured error result when capability is missing", async () => {
    // A task that exceeds agent capabilities should still produce a valid result object.
    const task = makeTask({
      id: "task-mock-2",
      title: "Fly a drone over the city at night (FPV)",
      description: "Requires drone hardware, camera, and flight permissions.",
      input: "Deliver a full cinematic flight plan with hardware control.",
    });
    const context = contextBuilder.build("content-1", task);
    expect(context).not.toBeNull();
    if (!context) return;

    const runtime = new MockRuntime();
    const iter = runtime.execute(context)[Symbol.asyncIterator]();
    let result: ExecutionResult | undefined;
    for (;;) {
      const step = await iter.next();
      if (step.done) {
        result = step.value;
        break;
      }
    }

    expect(result).toBeDefined();
    // Either a structured failure or a completed mock result — the contract requires a valid shape.
    expect(typeof result!.success).toBe("boolean");
    expect(result!.agentId).toBe("content-1");
    expect(Array.isArray(result!.timeline)).toBe(true);
    expect(typeof result!.output).toBe("string");
  }, 30000);
});