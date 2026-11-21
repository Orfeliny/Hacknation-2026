import type { AIConfig } from "./config";
import { withGuardrails } from "./guardrails";
import { createMockProvider } from "./mock";
import {
  createOpenAICompatibleProvider,
  type OpenAICompatibleDeps,
} from "./openaiCompatible";
import type { AIProvider } from "./types";

// No fallback between real providers: a failing real provider surfaces its own error.
export function getProvider(
  config: AIConfig,
  deps?: OpenAICompatibleDeps,
): AIProvider {
  // The mock reads [mock:...] scenario prefixes from the start of the prompt, so it is not wrapped.
  if (config.provider === "mock") {
    return withGuardrails(createMockProvider(), { wrapPrompt: false });
  }
  return withGuardrails(createOpenAICompatibleProvider(config, deps));
}
