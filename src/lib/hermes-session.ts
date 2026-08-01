export const AGENTHUB_HERMES_SOURCE = "agenthub_os";
export const AGENTHUB_HERMES_PROFILE = "agenthub";

export type AgentHubHermesScope =
  | "controller_analysis"
  | "controller_recovery"
  | "runtime"
  | "private_chat"
  | "group_discussion";

function sanitizeSessionPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "default";
}

export function getAgentHubHermesSessionSource(scope: AgentHubHermesScope, identity?: string): string {
  const parts = [AGENTHUB_HERMES_SOURCE, scope];
  if (identity) parts.push(sanitizeSessionPart(identity));
  return parts.join("_");
}