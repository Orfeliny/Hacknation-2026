import { describe, expect, it } from "vitest";
import { parseAIConfig } from "./config";
import { AIProviderError } from "./types";

const SECRET = "sk-super-secret-value-123";
const valid = {
  AI_PROVIDER: "openai-compatible",
  AI_BASE_URL: "https://ai.test.invalid/v1",
  AI_MODEL: "bielik",
  AI_API_KEY: SECRET,
};

function failure(env: Record<string, string | undefined>): AIProviderError {
  try {
    parseAIConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(AIProviderError);
    return error as AIProviderError;
  }
  throw new Error("expected parseAIConfig to throw");
}

describe("parseAIConfig", () => {
  it("reads variables by name when the environment cannot be enumerated", () => {
    const values: Record<string, string> = {
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "https://llm.example.com/v1",
      AI_MODEL: "model-x",
      AI_API_KEY: "secret",
    };
    const env = new Proxy<Record<string, string | undefined>>(
      {},
      {
        get: (_target, key) =>
          typeof key === "string" ? values[key] : undefined,
        ownKeys: () => [],
      },
    );
    expect(parseAIConfig(env)).toMatchObject({
      provider: "openai-compatible",
      model: "model-x",
    });
  });

  it("defaults to the mock provider", () => {
    expect(parseAIConfig({})).toEqual({ provider: "mock" });
    expect(parseAIConfig({ AI_PROVIDER: "" })).toEqual({ provider: "mock" });
    expect(parseAIConfig({ AI_PROVIDER: "mock" })).toEqual({
      provider: "mock",
    });
  });

  it("applies defaults for openai-compatible", () => {
    expect(parseAIConfig(valid)).toEqual({
      provider: "openai-compatible",
      baseUrl: "https://ai.test.invalid/v1",
      model: "bielik",
      embeddingModel: "bge-m3",
      apiKey: SECRET,
      timeoutMs: 20000,
      maxRetries: 1,
      structuredMode: "json_schema",
    });
  });

  it("reads overrides", () => {
    const config = parseAIConfig({
      ...valid,
      AI_TIMEOUT_MS: "5000",
      AI_MAX_RETRIES: "0",
      AI_STRUCTURED_MODE: "prompt",
      AI_EMBEDDING_MODEL: "multilingual-e5-large",
    });
    expect(config).toMatchObject({
      timeoutMs: 5000,
      maxRetries: 0,
      structuredMode: "prompt",
      embeddingModel: "multilingual-e5-large",
    });
  });

  it.each(["AI_BASE_URL", "AI_MODEL", "AI_API_KEY"])(
    "reports missing %s as config error",
    (name) => {
      const env: Record<string, string | undefined> = { ...valid };
      delete env[name];
      const error = failure(env);
      expect(error.code).toBe("config");
      expect(error.retryable).toBe(false);
      expect(error.message).toContain(name);
    },
  );

  it("rejects an unknown provider", () => {
    const error = failure({ AI_PROVIDER: "other", AI_API_KEY: SECRET });
    expect(error.code).toBe("config");
    expect(error.message).toContain("AI_PROVIDER");
    expect(error.message).not.toContain(SECRET);
  });

  it.each(["not a url", "ftp://ai.test.invalid", "ai.test.invalid/v1"])(
    "rejects bad URL %s",
    (url) => {
      const error = failure({ ...valid, AI_BASE_URL: url });
      expect(error.code).toBe("config");
      expect(error.message).toContain("AI_BASE_URL");
    },
  );

  it.each([
    "http://localhost:8000/v1",
    "http://127.0.0.1:8000/v1",
    "https://ai.test.invalid",
  ])("accepts %s", (url) => {
    expect(parseAIConfig({ ...valid, AI_BASE_URL: url })).toMatchObject({
      baseUrl: url,
    });
  });

  it.each([
    "http://ai.test.invalid/v1",
    "http://10.0.0.5/v1",
    "http://localhost.evil.test/v1",
  ])("rejects plain http for non-loopback host %s", (url) => {
    expect(failure({ ...valid, AI_BASE_URL: url }).code).toBe("config");
  });

  describe("AI_ALLOW_PRIVATE_HTTP", () => {
    const privateUrls = [
      "http://llm:11434/v1",
      "http://ollama/v1",
      "http://10.0.0.5/v1",
      "http://172.16.0.1:8000/v1",
      "http://172.31.255.255/v1",
      "http://192.168.1.10:8000/v1",
      "http://llm.urzad.local/v1",
      "http://vllm.corp.internal:8000/v1",
    ];

    it.each(privateUrls)("rejects %s without the flag", (url) => {
      const error = failure({ ...valid, AI_BASE_URL: url });
      expect(error.code).toBe("config");
      expect(error.message).toContain("AI_ALLOW_PRIVATE_HTTP");
    });

    it.each(privateUrls)("accepts %s with the flag", (url) => {
      expect(
        parseAIConfig({
          ...valid,
          AI_BASE_URL: url,
          AI_ALLOW_PRIVATE_HTTP: "true",
        }),
      ).toMatchObject({ baseUrl: url });
    });

    it.each([
      "http://ai.test.invalid/v1",
      "http://llm.urzad.gov.pl/v1",
      "http://8.8.8.8/v1",
      "http://172.32.0.1/v1",
      "http://172.15.0.1/v1",
      "http://192.169.0.1/v1",
      "http://11.0.0.1/v1",
      "http://llm.local.evil.test/v1",
      "http://internal.evil.test/v1",
      "http://[fd00::1]/v1",
    ])("rejects public or unsupported host %s even with the flag", (url) => {
      const error = failure({
        ...valid,
        AI_BASE_URL: url,
        AI_ALLOW_PRIVATE_HTTP: "true",
      });
      expect(error.code).toBe("config");
      expect(error.message).toContain("AI_BASE_URL");
    });

    it("accepts the hex form of a private IPv4 address after URL normalisation", () => {
      expect(
        parseAIConfig({
          ...valid,
          AI_BASE_URL: "http://0x0a000001/v1",
          AI_ALLOW_PRIVATE_HTTP: "true",
        }),
      ).toMatchObject({ provider: "openai-compatible" });
    });

    it("keeps https for public hosts working with the flag", () => {
      expect(
        parseAIConfig({ ...valid, AI_ALLOW_PRIVATE_HTTP: "true" }),
      ).toMatchObject({ baseUrl: valid.AI_BASE_URL });
    });

    it.each(["false", ""])("treats %j as off", (flag) => {
      expect(
        failure({
          ...valid,
          AI_BASE_URL: "http://llm:11434/v1",
          AI_ALLOW_PRIVATE_HTTP: flag,
        }).code,
      ).toBe("config");
    });

    it.each(["yes", "1", "TRUE"])("rejects flag value %s", (flag) => {
      const error = failure({ ...valid, AI_ALLOW_PRIVATE_HTTP: flag });
      expect(error.code).toBe("config");
      expect(error.message).toContain("AI_ALLOW_PRIVATE_HTTP");
    });

    it("does not echo the host in the error", () => {
      const error = failure({
        ...valid,
        AI_BASE_URL: "http://secret-host.example.org/v1",
        AI_ALLOW_PRIVATE_HTTP: "true",
      });
      expect(error.message).not.toContain("secret-host");
    });

    it("is ignored by the mock provider", () => {
      expect(
        parseAIConfig({ AI_PROVIDER: "mock", AI_ALLOW_PRIVATE_HTTP: "true" }),
      ).toEqual({ provider: "mock" });
    });
  });

  it.each([
    ["AI_TIMEOUT_MS", "0"],
    ["AI_TIMEOUT_MS", "abc"],
    ["AI_MAX_RETRIES", "-1"],
    ["AI_MAX_RETRIES", "1.5"],
    ["AI_STRUCTURED_MODE", "xml"],
  ])("rejects %s=%s", (name, value) => {
    const error = failure({ ...valid, [name]: value });
    expect(error.code).toBe("config");
    expect(error.message).toContain(name);
  });

  it("rejects URLs with credentials without echoing them", () => {
    const error = failure({
      ...valid,
      AI_BASE_URL: "https://user:hunter2@ai.test.invalid/v1",
    });
    expect(error.code).toBe("config");
    expect(error.message).toContain("AI_BASE_URL");
    expect(error.message).not.toContain("hunter2");
    expect(error.message).not.toContain("ai.test.invalid");
  });

  it("accepts the upper bounds for timeout and retries", () => {
    expect(
      parseAIConfig({
        ...valid,
        AI_TIMEOUT_MS: "120000",
        AI_MAX_RETRIES: "3",
      }),
    ).toMatchObject({ timeoutMs: 120000, maxRetries: 3 });
  });

  it.each([
    ["AI_TIMEOUT_MS", "120001"],
    ["AI_MAX_RETRIES", "4"],
  ])("rejects %s=%s above the cap", (name, value) => {
    const error = failure({ ...valid, [name]: value });
    expect(error.code).toBe("config");
    expect(error.message).toContain(name);
  });

  it("never puts the API key in an error message", () => {
    const envs = [
      { ...valid, AI_BASE_URL: "http://ai.test.invalid" },
      { ...valid, AI_MODEL: undefined },
      { ...valid, AI_TIMEOUT_MS: SECRET },
      { ...valid, AI_STRUCTURED_MODE: SECRET },
      { ...valid, AI_BASE_URL: SECRET },
    ];
    for (const env of envs) {
      const error = failure(env);
      expect(error.message).not.toContain(SECRET);
      expect(String(error.stack)).not.toContain(SECRET);
    }
  });
});
