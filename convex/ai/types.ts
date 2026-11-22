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
  // One vector per text, in order, EMBEDDING_DIMENSIONS long. At most MAX_EMBED_BATCH texts per call.
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
