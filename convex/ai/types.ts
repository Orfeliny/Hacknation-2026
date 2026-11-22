import type { z } from "zod";

export type ProviderId = "mock" | "openai-compatible";

export type TextResult = {
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  provider: string;
  model: string;
};

export type StructuredResult<T> = {
  data: T;
  usage?: { inputTokens?: number; outputTokens?: number };
  provider: string;
  model: string;
};

export type EmbedResult = {
  vectors: number[][];
  usage?: { inputTokens?: number };
  provider: string;
  model: string;
};

// A vector index has a fixed size: the knowledge base (convex/knowledge/tables.ts) is built for bge-m3.
export const EMBEDDING_DIMENSIONS = 1024;
export const MAX_EMBED_BATCH = 64;
export const MAX_EMBED_TEXT_CHARS = 8000;

export type ProviderInfo = {
  id: ProviderId;
  model: string;
  baseUrlHost?: string;
};

export interface AIProvider {
  generateText(input: {
    prompt: string;
    system?: string;
    maxTokens?: number;
  }): Promise<TextResult>;
  generateStructuredOutput<T>(input: {
    prompt: string;
    system?: string;
    schema: z.ZodType<T>;
    schemaName: string;
    // Used only by the mock provider when it has no fixture of its own for schemaName.
    mockFixture?: NoInfer<T>;
  }): Promise<StructuredResult<T>>;
  // One vector per text, in order, EMBEDDING_DIMENSIONS long. 1 to MAX_EMBED_BATCH non-empty texts of at most
  // MAX_EMBED_TEXT_CHARS characters per call.
  // Documents are not prompts: guardrails do not wrap or rewrite them.
  embed(input: { texts: string[] }): Promise<EmbedResult>;
  getProviderInfo(): ProviderInfo;
}

export type AIProviderErrorCode =
  | "config"
  | "timeout"
  | "unavailable"
  | "auth"
  | "rate_limited"
  | "bad_response"
  | "guardrail";

export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;
  readonly retryable: boolean;

  constructor(
    code: AIProviderErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "AIProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

// Shared by every provider so the mock fails the way a real endpoint would (an empty input is a 400 there).
export function assertEmbedTexts(texts: string[]): void {
  if (texts.length === 0 || texts.length > MAX_EMBED_BATCH) {
    throw new AIProviderError(
      "config",
      `embed takes 1 to ${MAX_EMBED_BATCH} texts per call`,
    );
  }
  for (const text of texts) {
    if (text.trim() === "") {
      throw new AIProviderError("config", "embed does not take an empty text");
    }
    if (text.length > MAX_EMBED_TEXT_CHARS) {
      throw new AIProviderError(
        "config",
        `embed takes at most ${MAX_EMBED_TEXT_CHARS} characters per text`,
      );
    }
  }
}
