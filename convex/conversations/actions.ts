import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { getProvider } from "../ai/index";
import { AIProviderError, type AIProviderErrorCode } from "../ai/types";
import { demoActor } from "../lib/demoRole";
import { RULES_2016 } from "../rules/pack2016";
import { SYSTEM_PROMPT, buildPrompt, pseudonymize } from "./prompt";
import {
  MOCK_PLANS,
  conversationPlanSchema,
  type ConversationPlan,
} from "./schema";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export type PrepareResult =
  | { ok: true; plan: ConversationPlan; provider: string }
  | { ok: false; code: AIProviderErrorCode | "forbidden"; message: string };

const MESSAGES: Record<AIProviderErrorCode | "forbidden", string> = {
  forbidden: "Plan rozmowy przygotowuje jej autor.",
  config:
    "AI jest nieprawidłowo skonfigurowane. Możesz napisać plan samodzielnie.",
  timeout:
    "AI odpowiada zbyt długo. Spróbuj ponownie albo napisz plan samodzielnie.",
  unavailable: "AI jest niedostępne. Możesz napisać plan samodzielnie.",
  auth: "Dostawca AI odrzucił dane dostępowe. Możesz napisać plan samodzielnie.",
  rate_limited: "Zbyt wiele zapytań do AI. Spróbuj za chwilę.",
  guardrail:
    "Odpowiedź AI została zablokowana przez zabezpieczenia. Napisz plan samodzielnie.",
  bad_response: "AI zwróciło nieoczekiwaną odpowiedź. Spróbuj ponownie.",
};

const fail = (code: AIProviderErrorCode | "forbidden"): PrepareResult => ({
  ok: false,
  code,
  message: MESSAGES[code],
});

export const prepare = action({
  args: {
    actor: demoActor,
    conversationId: v.id("conversations"),
    situation: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { actor, conversationId, situation },
  ): Promise<PrepareResult> => {
    const context = await ctx.runQuery(
      internal.conversations.queries.promptContext,
      {
        actor,
        conversationId,
      },
    );
    if (!context) return fail("forbidden");
    const prompt = pseudonymize(
      buildPrompt({ ...context, situation: situation?.slice(0, 2000) }),
      context.names,
    );
    try {
      const provider = getProvider(parseAIConfig(process.env));
      const result = await provider.generateStructuredOutput({
        system: SYSTEM_PROMPT,
        prompt,
        schema: conversationPlanSchema,
        schemaName: "conversationPlan",
        mockFixture: MOCK_PLANS[context.kind],
      });
      // Only catalogue criteria survive, and none of the mandatory ones (§ 5 ust. 2).
      const allowed = new Set<string>(context.catalog.map((c) => c.id));
      const plan: ConversationPlan = {
        ...result.data,
        suggestedCriteria:
          context.kind === "opening"
            ? result.data.suggestedCriteria
                ?.filter((s) => allowed.has(s.criterionId))
                .slice(0, 3)
            : undefined,
        questions: result.data.questions.map((q) =>
          q.criterionId &&
          !RULES_2016.catalog.some((c) => (c.id as string) === q.criterionId)
            ? { text: q.text }
            : q,
        ),
      };
      const stored = { ...plan };
      delete stored.suggestedCriteria;
      await ctx.runMutation(internal.audit.mutations.recordAiInteraction, {
        module: `conversations.prepare.${context.kind}`,
        provider: result.provider,
        model: result.model,
        sentPrompt: prompt,
        output: JSON.stringify(result.data),
        actorId: context.authorId,
        employeeId: context.employeeId,
        reviewId: context.reviewId,
      });
      await ctx.runMutation(internal.conversations.mutations.storePlan, {
        conversationId,
        plan: stored,
      });
      return { ok: true, plan, provider: result.provider };
    } catch (error) {
      if (!(error instanceof AIProviderError)) {
        console.error("conversations.prepare failed unexpectedly", error);
      }
      return fail(
        error instanceof AIProviderError ? error.code : "unavailable",
      );
    }
  },
});
