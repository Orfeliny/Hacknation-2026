import { AIProviderError } from "../ai/types";
import { parseAIConfig } from "../ai/config";

export type Residency = "local" | "external";

export type AIStatus =
  | { state: "mock"; provider: "mock"; model: "mock" }
  | {
      state: Residency;
      provider: "openai-compatible";
      model: string;
      host: string;
    }
  | { state: "invalid"; message: string };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

function isPrivateIPv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  return (
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  );
}

// Same rule as `isPrivateHost` in convex/ai/config.ts (not exported from a shared file); a test keeps them equal.
export function classifyHost(hostname: string): Residency {
  const host = hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host) || isPrivateIPv4(host)) return "local";
  if (/^[a-z0-9-]+$/.test(host) && !/^\d+$/.test(host)) return "local";
  if (/^([a-z0-9-]+\.)+(local|internal)$/.test(host)) return "local";
  return "external";
}

export function describeAI(env: Record<string, string | undefined>): AIStatus {
  try {
    const config = parseAIConfig(env);
    if (config.provider === "mock") {
      return { state: "mock", provider: "mock", model: "mock" };
    }
    const url = new URL(config.baseUrl);
    return {
      state: classifyHost(url.hostname),
      provider: config.provider,
      model: config.model,
      host: url.host,
    };
  } catch (error) {
    if (error instanceof AIProviderError) {
      return { state: "invalid", message: error.message };
    }
    throw error;
  }
}
