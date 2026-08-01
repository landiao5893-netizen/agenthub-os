import type { Project, SubTaskDef, TaskAnalysis } from "@/controller/types";
import { realLLM } from "@/controller/real-llm";
import { memoryRetrieval } from "@/memory/retrieval";
import { workspaceEngine } from "@/workspace/engine";
import type { IntelligenceTaskResult } from "./types";

class HermesIntelligenceLayer {
  async plan(userInput: string, signal?: AbortSignal): Promise<TaskAnalysis> {
    return realLLM.analyze(userInput, signal);
  }

  prepareAgentInput(project: Project, subtask: SubTaskDef): string {
    const memoryContext = memoryRetrieval.getRetrievalContext(
      subtask.assignedAgent,
      subtask.title,
      subtask.description,
    );
    const workspaceContext = workspaceEngine.getContextForAgent(project.id, subtask.assignedAgent);
    const firstRootTask = project.subtasks.find((candidate) => candidate.subtaskDef.dependsOn.length === 0);
    const attachmentStart = project.userRequest.indexOf("<agenthub_attachment");
    const sourceAttachment = firstRootTask?.subtaskDef.id === subtask.id && attachmentStart >= 0
      ? "# Original user attachment\n" + project.userRequest.slice(attachmentStart)
      : "";

    return [
      subtask.input,
      sourceAttachment,
      workspaceContext ? "# 上游项目产出\n" + workspaceContext : "",
      memoryContext ? "# 相关长期记忆\n" + memoryContext : "",
    ].filter(Boolean).join("\n\n");
  }

  synthesize(results: IntelligenceTaskResult[]): string {
    const successful = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);
    const sections = successful.map((result) => `## ${result.agentName}\n${result.output}`);

    if (failed.length > 0) {
      sections.push([
        "## 未完成事项",
        ...failed.map((result) => `- ${result.agentName}：${result.status ?? "FAILED"}`),
      ].join("\n"));
    }

    return sections.join("\n\n---\n\n");
  }
}

export const hermesIntelligence = new HermesIntelligenceLayer();
