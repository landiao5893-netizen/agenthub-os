export const HERMES_RUNTIME_VERSION = "0.19.0";
export const HERMES_RUNTIME_TAG = "v2026.7.20";

export type IntelligenceRunMode = "planning" | "runtime" | "private_chat" | "group_discussion" | "synthesis" | "image_generation";

export interface IntelligenceRunRequest {
  input: string;
  run_mode: IntelligenceRunMode;
  provider?: string;
  providerConfigId?: string;
  model?: string;
  apiUrl?: string;
  apiToken?: string;
  session_id?: string;
  session_source?: string;
  instructions?: string;
  timeout_ms?: number;
  enabled_toolsets?: string[];
  artifact_output_path?: string;
  artifact_root_path?: string;
}

export interface IntelligenceRunResponse {
  ok: boolean;
  output?: string;
  error?: string;
  session_id?: string;
  runtime_version?: string;
  events?: Array<Record<string, unknown>>;
  result?: {
    text?: string;
    content?: unknown;
  };
}

export interface IntelligenceTaskResult {
  agentName: string;
  success: boolean;
  status?: string;
  output: string;
}
