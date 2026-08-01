export type ManagedProviderKind = "opencode-go" | "openai" | "claude" | "deepseek" | "custom";
export type ManagedProviderUsage = "text" | "image" | "video";

export interface ManagedProviderConfig {
  id: string;
  name: string;
  kind: ManagedProviderKind;
  usage: ManagedProviderUsage;
  baseUrl: string;
  hasApiKey: boolean;
  apiKeyHint: string;
  models: string[];
  defaultModel: string;
  enabled: boolean;
  updatedAt: string;
}

export interface ManagedProviderState {
  version: 1;
  revision: number;
  providers: ManagedProviderConfig[];
}

