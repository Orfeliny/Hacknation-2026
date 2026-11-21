import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { parseAIConfig } from "../ai/config";
import schema from "../schema";
import { classifyHost, describeAI } from "./classify";

const modules = import.meta.glob("/convex/**/*.*s");

const SECRET = "sk-very-secret-key";

const real = (baseUrl: string, extra: Record<string, string> = {}) => ({
  AI_PROVIDER: "openai-compatible",
  AI_BASE_URL: baseUrl,
  AI_MODEL: "bielik-11b",
  AI_API_KEY: SECRET,
  ...extra,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("classifyHost", () => {
  it.each([
    ["localhost", "local"],
    ["127.0.0.1", "local"],
    ["10.1.2.3", "local"],
    ["172.16.0.1", "local"],
    ["172.31.255.254", "local"],
    ["192.168.1.10", "local"],
    ["llm", "local"],
    ["llm.urzad.local", "local"],
    ["vllm.corp.internal", "local"],
    ["172.32.0.1", "external"],
    ["192.169.0.1", "external"],
    ["8.8.8.8", "external"],
    ["api.openai.com", "external"],
    ["llm.urzad.gov.pl", "external"],
  ] as const)("%s is %s", (host, expected) => {
    expect(classifyHost(host)).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(classifyHost("LLM.Urzad.LOCAL")).toBe("local");
  });

  it("agrees with the rule AI_ALLOW_PRIVATE_HTTP uses in the provider config", () => {
    const hosts = [
      "localhost",
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.32.0.1",
      "192.168.1.10",
      "192.169.0.1",
      "8.8.8.8",
      "llm",
      "llm.urzad.local",
      "vllm.corp.internal",
      "llm.urzad.gov.pl",
      "api.openai.com",
      "123",
    ];
    for (const host of hosts) {
      const accepted = (() => {
        try {
          parseAIConfig(
            real(`http://${host}/v1`, { AI_ALLOW_PRIVATE_HTTP: "true" }),
          );
          return true;
        } catch {
          return false;
        }
      })();
      const hostname = new URL(`http://${host}`).hostname;
      expect({ host, local: classifyHost(hostname) === "local" }).toEqual({
        host,
        local: accepted,
      });
    }
  });
});

describe("describeAI", () => {
  it("reports the mock", () => {
    expect(describeAI({})).toEqual({
      state: "mock",
      provider: "mock",
      model: "mock",
    });
    expect(describeAI({ AI_PROVIDER: "mock" }).state).toBe("mock");
  });

  it("reports a local model with its host and port", () => {
    expect(
      describeAI(
        real("http://llm.urzad.local:8000/v1", {
          AI_ALLOW_PRIVATE_HTTP: "true",
        }),
      ),
    ).toEqual({
      state: "local",
      provider: "openai-compatible",
      model: "bielik-11b",
      host: "llm.urzad.local:8000",
    });
  });

  it("reports an external model", () => {
    expect(describeAI(real("https://api.example.com/v1"))).toMatchObject({
      state: "external",
      host: "api.example.com",
    });
  });

  it("reports an invalid configuration with a safe message", () => {
    const result = describeAI({
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "http://api.example.com/v1",
      AI_MODEL: "m",
      AI_API_KEY: SECRET,
    });
    expect(result.state).toBe("invalid");
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(JSON.stringify(result)).not.toContain("api.example.com");
  });
});

describe("aiStatus.queries.status", () => {
  async function read() {
    const t = convexTest(schema, modules);
    return await t.query(api.aiStatus.queries.status, {});
  }

  it("reads the Convex env, mock by default", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    expect(await read()).toMatchObject({ state: "mock" });
  });

  it("never returns the key, the path or the query string of the URL", async () => {
    for (const [key, value] of Object.entries(
      real("https://api.example.com/secret/path/v1?token=abc123"),
    )) {
      vi.stubEnv(key, value);
    }
    const result = await read();
    expect(result).toMatchObject({
      state: "external",
      host: "api.example.com",
    });
    const text = JSON.stringify(result);
    for (const leaked of [SECRET, "secret/path", "abc123", "token", "https"]) {
      expect(text).not.toContain(leaked);
    }
  });
});
