import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { ManagedProviderConfig, ManagedProviderKind, ManagedProviderUsage } from "@/types/provider-config";

const DATA_DIR = process.env.AGENTHUB_DATA_DIR ?? path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "provider-state.json");
const KEY_PATH = path.join(DATA_DIR, ".provider-secrets.key");

interface StoredProvider extends Omit<ManagedProviderConfig, "hasApiKey" | "apiKeyHint"> {
  encryptedApiKey?: string;
}

interface StoredState {
  version: 1;
  revision: number;
  providers: StoredProvider[];
}

export interface ProviderSecret extends ManagedProviderConfig {
  apiKey: string;
}

let writeQueue: Promise<unknown> = Promise.resolve();

function publicProvider(provider: StoredProvider): ManagedProviderConfig {
  let hint = "";
  if (provider.encryptedApiKey) {
    try {
      const value = decrypt(provider.encryptedApiKey, cachedKey!);
      hint = value.length > 4 ? `...${value.slice(-4)}` : "已配置";
    } catch {
      hint = "已配置";
    }
  }
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    usage: provider.usage,
    baseUrl: provider.baseUrl,
    hasApiKey: Boolean(provider.encryptedApiKey),
    apiKeyHint: hint,
    models: provider.models,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    updatedAt: provider.updatedAt,
  };
}

let cachedKey: Buffer | null = null;

async function encryptionKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const encoded = (await fs.readFile(KEY_PATH, "utf8")).trim();
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new Error("invalid provider key");
    cachedKey = key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    cachedKey = randomBytes(32);
    await fs.writeFile(KEY_PATH, cachedKey.toString("base64"), { encoding: "utf8", mode: 0o600 });
  }
  return cachedKey;
}

function encrypt(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((item) => item.toString("base64")).join(".");
}

function decrypt(value: string, key: Buffer): string {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("invalid encrypted provider key");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
}

async function readStoredState(): Promise<StoredState> {
  await encryptionKey();
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_PATH, "utf8")) as StoredState;
    if (parsed.version !== 1 || !Array.isArray(parsed.providers)) throw new Error("Provider 配置文件格式错误");
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, revision: 0, providers: [] };
    throw error;
  }
}

async function writeStoredState(state: StoredState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${STATE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tempPath, STATE_PATH);
}

export async function listProviders(): Promise<{ revision: number; providers: ManagedProviderConfig[] }> {
  const state = await readStoredState();
  return { revision: state.revision, providers: state.providers.map(publicProvider) };
}

export async function getProviderSecret(id: string): Promise<ProviderSecret | null> {
  const state = await readStoredState();
  const provider = state.providers.find((item) => item.id === id && item.enabled);
  if (!provider) return null;
  const key = await encryptionKey();
  return { ...publicProvider(provider), apiKey: provider.encryptedApiKey ? decrypt(provider.encryptedApiKey, key) : "" };
}

export async function getDefaultProvider(usage: ManagedProviderUsage): Promise<ProviderSecret | null> {
  const state = await readStoredState();
  const provider = state.providers.find((item) => item.enabled && item.usage === usage);
  if (!provider) return null;
  const key = await encryptionKey();
  return { ...publicProvider(provider), apiKey: provider.encryptedApiKey ? decrypt(provider.encryptedApiKey, key) : "" };
}

export async function saveProvider(input: {
  id?: string;
  name: string;
  kind: ManagedProviderKind;
  usage: ManagedProviderUsage;
  baseUrl: string;
  apiKey?: string;
  models?: string[];
  defaultModel?: string;
  enabled?: boolean;
}): Promise<{ revision: number; provider: ManagedProviderConfig }> {
  const operation = writeQueue.then(async () => {
    const state = await readStoredState();
    const id = (input.id?.trim() || `provider-${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const index = state.providers.findIndex((item) => item.id === id);
    const previous = index >= 0 ? state.providers[index] : undefined;
    const key = await encryptionKey();
    const models = Array.from(new Set((input.models ?? previous?.models ?? []).map((item) => item.trim()).filter(Boolean))).slice(0, 300);
    const stored: StoredProvider = {
      id,
      name: input.name.trim().slice(0, 80),
      kind: input.kind,
      usage: input.usage,
      baseUrl: input.baseUrl.trim().replace(/\/+$/, ""),
      encryptedApiKey: input.apiKey?.trim() ? encrypt(input.apiKey.trim(), key) : previous?.encryptedApiKey,
      models,
      defaultModel: input.defaultModel?.trim() || previous?.defaultModel || models[0] || "",
      enabled: input.enabled ?? true,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) state.providers[index] = stored;
    else state.providers.push(stored);
    state.revision += 1;
    await writeStoredState(state);
    return { revision: state.revision, provider: publicProvider(stored) };
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function updateProviderModels(id: string, models: string[]): Promise<ManagedProviderConfig> {
  const operation = writeQueue.then(async () => {
    const state = await readStoredState();
    const provider = state.providers.find((item) => item.id === id);
    if (!provider) throw new Error("Provider 不存在");
    provider.models = Array.from(new Set(models.map((item) => item.trim()).filter(Boolean))).slice(0, 300);
    if (!provider.defaultModel && provider.models[0]) provider.defaultModel = provider.models[0];
    provider.updatedAt = new Date().toISOString();
    state.revision += 1;
    await writeStoredState(state);
    return publicProvider(provider);
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function deleteProvider(id: string): Promise<void> {
  const operation = writeQueue.then(async () => {
    const state = await readStoredState();
    state.providers = state.providers.filter((item) => item.id !== id);
    state.revision += 1;
    await writeStoredState(state);
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  await operation;
}

