import type { z } from "zod";
import {
  AIProviderError,
  EMBEDDING_DIMENSIONS,
  MAX_EMBED_BATCH,
  type AIProvider,
  type EmbedResult,
  type ProviderInfo,
  type StructuredResult,
  type TextResult,
} from "./types";

const PROVIDER = "mock";
const MODEL = "mock";

const FIXTURES: Record<string, unknown> = {
  notesSummary: {
    summary:
      "Notatka omawia kluczowe ustalenia i kolejne kroki. To przykładowe podsumowanie wygenerowane przez dostawcę testowego.",
    keyPoints: [
      "Najważniejsze ustalenie z notatki",
      "Kolejny krok do wykonania",
      "Otwarte pytanie do omówienia",
    ],
  },
};

function simulateFailure(prompt: string): void {
  if (prompt.startsWith("[mock:error]")) {
    throw new AIProviderError("unavailable", "Mock provider forced an error", {
      retryable: true,
    });
  }
  if (prompt.startsWith("[mock:timeout]")) {
    throw new AIProviderError("timeout", "Mock provider forced a timeout", {
      retryable: true,
    });
  }
}

function cannedText(prompt: string): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  const start = words.slice(0, 5).join(" ");
  return `Podsumowanie (tryb testowy): tekst ma ${prompt.length} znaków i zaczyna się od „${start}”.`;
}

// Offline stand-in for an embedding model: each word of the text is hashed (FNV-1a) into one of the
// dimensions with a sign, then the vector is normalised. Texts that share words land close together,
// which is enough to exercise retrieval in tests; it is not semantic search.
function hashEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  for (const word of words) {
    let hash = 0x811c9dc5;
    for (const char of word) {
      hash = Math.imul(hash ^ char.codePointAt(0)!, 0x01000193) >>> 0;
    }
    const slot = hash % EMBEDDING_DIMENSIONS;
    vector[slot] = (vector[slot] ?? 0) + (hash & 0x80000000 ? -1 : 1);
  }
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  if (norm === 0) {
    vector[0] = 1;
    return vector;
  }
  return vector.map((x) => x / norm);
}

// Everything here is synchronous; the executor turns a throw into a rejection.
function settle<T>(run: () => T): Promise<T> {
  return new Promise((resolve) => {
    resolve(run());
  });
}

export function createMockProvider(): AIProvider {
  return {
    generateText(input): Promise<TextResult> {
      return settle(() => {
        simulateFailure(input.prompt);
        return {
          text: cannedText(input.prompt),
          provider: PROVIDER,
          model: MODEL,
        };
      });
    },

    generateStructuredOutput<T>(input: {
      prompt: string;
      system?: string;
      schema: z.ZodType<T>;
      schemaName: string;
      mockFixture?: NoInfer<T>;
    }): Promise<StructuredResult<T>> {
      return settle(() => {
        simulateFailure(input.prompt);
        const own = Object.hasOwn(FIXTURES, input.schemaName);
        if (!own && input.mockFixture === undefined) {
          throw new AIProviderError(
            "config",
            `Mock provider has no fixture for schema "${input.schemaName}"`,
          );
        }
        const parsed = input.schema.safeParse(
          own ? FIXTURES[input.schemaName] : input.mockFixture,
        );
        if (!parsed.success) {
          throw new AIProviderError(
            "bad_response",
            `Mock fixture "${input.schemaName}" does not match the schema`,
          );
        }
        return { data: parsed.data, provider: PROVIDER, model: MODEL };
      });
    },

    embed(input): Promise<EmbedResult> {
      return settle(() => {
        if (input.texts.length === 0 || input.texts.length > MAX_EMBED_BATCH) {
          throw new AIProviderError(
            "config",
            `embed takes 1 to ${MAX_EMBED_BATCH} texts per call`,
          );
        }
        for (const text of input.texts) simulateFailure(text);
        return {
          vectors: input.texts.map(hashEmbedding),
          provider: PROVIDER,
          model: MODEL,
        };
      });
    },

    getProviderInfo(): ProviderInfo {
      return { id: "mock", model: MODEL };
    },
  };
}
