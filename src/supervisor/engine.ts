// ============================================
// Supervisor Engine — AI 主管
// 监督执行 + 质量把关 + 失败恢复
// ============================================

import {
  SupervisorState, SupervisorLogEntry,
  QualityScore, RecoveryAction, FailureType, MAX_RETRY_ATTEMPTS,
} from "./types";
import { qualityGate } from "./quality-gate";
import { getAgentProfile } from "@/lib/agent-profiles";
import { useChatStore } from "@/stores/chatStore";
import { AgentInternalStatus } from "@/types";
import { memorySummarizer } from "@/memory/summarizer";
import { useWorkflowStore } from "@/stores/workflowStore";

type SupervisorListener = (state: SupervisorState) => void;

class SupervisorEngine {
  private state: SupervisorState = {
    isActive: false,
    projectId: null,
    projectName: "",
    supervisedAgents: [],
    gatesPassed: 0,
    gatesFailed: 0,
    recoveryAttempts: 0,
    log: [],
  };
  private listeners: SupervisorListener[] = [];

  subscribe(fn: SupervisorListener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state, supervisedAgents: [...this.state.supervisedAgents], log: [...this.state.log] }));
  }

  getState(): SupervisorState {
    return { ...this.state, supervisedAgents: [...this.state.supervisedAgents], log: [...this.state.log] };
  }

  // ===== 初始化监督 =====
  startSupervision(projectId: string, projectName: string, agentIds: string[]) {
    this.state = {
      isActive: true, projectId, projectName,
      supervisedAgents: agentIds.map(aid => ({
        agentId: aid,
        agentName: getAgentProfile(aid)?.name ?? aid,
        currentStatus: "IDLE" as AgentInternalStatus,
        taskTitle: "",
        qualityScore: null,
        attempts: 0,
      })),
      gatesPassed: 0, gatesFailed: 0,
      recoveryAttempts: 0,
      log: [],
    };
    this.addLog("info", "system", "Supervisor 开始监督项目执行");
    this.notify();
  }

  // ===== 质量检查 =====
  async checkQuality(
    agentId: string, taskTitle: string, taskDescription: string,
    output: string
  ): Promise<{ score: QualityScore; action: RecoveryAction | null }> {
    const agent = this.state.supervisedAgents.find(a => a.agentId === agentId);
    const agentName = agent?.agentName ?? agentId;

    // 快速检查
    const quick = qualityGate.quickCheck(output);
    if (!quick.passed) {
      const score: QualityScore = {
        agentId,
        agentName,
        taskTitle,
        dimensions: [],
        totalScore: 0,
        passed: false,
        status: "FAIL",
        feedback: quick.reason ?? "输出不合格",
        checkedAt: Date.now(),
      };

      if (agent) {
        agent.qualityScore = score;
        agent.currentStatus = "ERROR";
        agent.attempts++;
      }
      this.state.gatesFailed++;
      await memorySummarizer.updateFromQualityFeedback(
        agentId, taskTitle, score.totalScore, score.feedback, score.passed
      );
      this.addLog("fail", agentId, "快速检查失败：" + score.feedback);
      this.notify();

      const action = this.determineRecovery(agentId, quick.failureType ?? "empty_output", agent?.attempts ?? 0);
      if (action) {
        this.state.recoveryAttempts++;
        this.addLog("recovery", agentId, action.reason);
      }
      this.notify();

      return { score, action };
    }

    // 详细评分
    const score = qualityGate.evaluate(agentId, agentName, taskTitle, taskDescription, output);

    await memorySummarizer.updateFromQualityFeedback(
      agentId, taskTitle, score.totalScore, score.feedback, score.passed
    );

    // 更新状态
    if (agent) {
      agent.qualityScore = score;
      agent.attempts++;

      if (score.passed) {
        this.state.gatesPassed++;
        agent.currentStatus = "DONE";
        this.addLog("pass", agentId, `✅ PASS — ${score.totalScore}分`);
        useChatStore.getState().addMessage({
          id: `sup-${Date.now()}`, agentId: "controller",
          content: `[质量审核] ${agentName} — ${score.totalScore}分 ${score.status === "PASS" ? "✅" : "⚠️"} — ${score.feedback}`,
          type: "system", timestamp: new Date(),
        });
      } else {
        this.state.gatesFailed++;
        if (score.status === "FAIL") {
          agent.currentStatus = "ERROR";
          this.addLog("fail", agentId, `❌ FAIL — ${score.totalScore}分 — ${score.feedback}`);
        }
      }
    }

    this.notify();

    // 不通过 → 生成恢复策略
    let action: RecoveryAction | null = null;
    if (!score.passed && score.status === "FAIL") {
      action = this.determineRecovery(agentId, "quality_low", agent?.attempts ?? 0);
      if (action) {
        this.state.recoveryAttempts++;
        this.addLog("recovery", agentId, action.reason);
        this.notify();
      }
    }

    return { score, action };
  }

  // ===== 失败恢复策略 =====
  determineRecovery(agentId: string, failureType: FailureType, attempts: number): RecoveryAction | null {
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      useChatStore.getState().addMessage({
        id: `sup-max-${Date.now()}`, agentId: "controller",
        content: `⚠️ [Supervisor] ${agentId} 已重试 ${attempts} 次，达到上限，建议人工介入`,
        type: "system", timestamp: new Date(),
      });
      return null;
    }

    const remaining = MAX_RETRY_ATTEMPTS - attempts;

    switch (failureType) {
      case "empty_output":
        return {
          type: "reprompt", reason: "输出为空，调整提示词重试",
          attemptsRemaining: remaining, targetAgentId: agentId,
          modifiedPrompt: "请提供详细、具体的回答，不少于200字。",
        };
      case "api_error":
        return {
          type: "retry", reason: "API 调用失败，重试",
          attemptsRemaining: remaining, targetAgentId: agentId,
        };
      case "timeout":
        return {
          type: attempts >= 1 ? "switch_model" : "retry",
          reason: attempts >= 1 ? "超时，切换模型重试" : "超时，重试",
          attemptsRemaining: remaining, targetAgentId: agentId,
          targetModel: attempts >= 1 ? (agentId === "reviewer-1" ? "deepseek-v4-pro" : "deepseek-v4-flash") : undefined,
        };
      case "quality_low":
        return {
          type: attempts >= 2 ? "switch_agent" : "reprompt",
          reason: attempts >= 2 ? "质量持续不达标，考虑更换 Agent" : "质量不达标，强化提示词重试",
          attemptsRemaining: remaining, targetAgentId: agentId,
          modifiedPrompt: "请严格按要求完成。提高完整性和准确性。",
        };
      default:
        return { type: "retry", reason: "未知错误，重试", attemptsRemaining: remaining, targetAgentId: agentId };
    }
  }

  // ===== 日志 =====
  private addLog(type: SupervisorLogEntry["type"], agentId: string, message: string) {
    const id = `sup-log-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    this.state.log.push({
      id,
      timestamp: Date.now(), type, agentId, message,
    });
    useWorkflowStore.getState().addEventLog({
      id: `${id}-event`,
      timestamp: new Date(),
      agentId: agentId === "system" ? "supervisor" : agentId,
      event: `Supervisor · ${type}`,
      detail: message,
      level: type === "pass" ? "success" : type === "fail" ? "error" : type === "recovery" || type === "retry" ? "warn" : "info",
    });
  }
}

export const supervisorEngine = new SupervisorEngine();
