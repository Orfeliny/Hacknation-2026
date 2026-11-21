import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { createPseudonymizer } from "../ai/guardrails";
import { getProvider } from "../ai/index";
import { AIProviderError } from "../ai/types";
import { demoActor } from "../lib/demoRole";
import { deniedMessage } from "./errors";
import { toFragments } from "./fragments";
import {
  buildDraftPrompt,
  DRAFT_SYSTEM,
  draftFixture,
  draftSchema,
} from "./prompts";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export type GenerateResult =
  | { ok: true; inserted: number; droppedActions: number; provider: string }
  | { ok: false; code: string; message: string };

const MESSAGES: Record<string, string> = {
  config: "AI jest nieprawidłowo skonfigurowane. Sprawdź ustawienia serwera.",
  timeout: "AI niedostępne: odpowiedź trwała zbyt długo. Spróbuj ponownie.",
  unavailable: "AI niedostępne. Możesz napisać fragmenty ręcznie.",
  auth: "AI niedostępne: dostawca odrzucił dane dostępowe.",
  rate_limited: "AI niedostępne: zbyt wiele zapytań. Spróbuj ponownie później.",
  bad_response: "AI zwróciło nieoczekiwaną odpowiedź. Spróbuj ponownie.",
};

function failure(code: string, message?: string): GenerateResult {
  return {
    ok: false,
    code,
    message: message ?? MESSAGES[code] ?? MESSAGES.unavailable ?? "",
  };
}

function toFailure(error: unknown): GenerateResult {
  if (error instanceof AIProviderError) {
    // The guardrail error carries its own safe Polish message.
    return error.code === "guardrail"
      ? failure("guardrail", error.message)
      : failure(error.code);
  }
  const refusal = deniedMessage(error);
  if (refusal) return failure("denied", refusal);
  // Name only: a provider error may echo the (pseudonymised) request.
  console.error(
    "drafting.generate failed unexpectedly",
    error instanceof Error ? error.name : typeof error,
  );
  return failure("unavailable");
}

// Builds a draft from the ratings the evaluator already chose and the observations they may read.
// The model receives the ratings as facts and cites observation labels; it never picks a rating
// (the system prompt forbids it and the shared guardrails block an answer that names one). Only the
// fragments still "proposed" are replaced, so the evaluator's decisions survive a new run.
export const generate = action({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, args): Promise<GenerateResult> => {
    try {
      const context = await ctx.runQuery(
        internal.drafting.queries.draftContext,
        args,
      );
      const pseudo = createPseudonymizer([
        `${context.employee.firstName} ${context.employee.lastName}`,
        `${context.evaluator.firstName} ${context.evaluator.lastName}`,
      ]);
      const provider = getProvider(parseAIConfig(process.env));
      const result = await provider.generateStructuredOutput({
        system: DRAFT_SYSTEM,
        prompt: pseudo.pseudonymize(buildDraftPrompt(context)),
        schema: draftSchema,
        schemaName: "reviewDraft",
        mockFixture: draftFixture(context),
      });
      const fragments = toFragments(pseudo.restoreDeep(result.data), context);
      const saved = await ctx.runMutation(
        internal.drafting.mutations.replaceProposed,
        { reviewId: args.reviewId, fragments },
      );
      return { ok: true, ...saved, provider: result.provider };
    } catch (error) {
      return toFailure(error);
    }
  },
});
