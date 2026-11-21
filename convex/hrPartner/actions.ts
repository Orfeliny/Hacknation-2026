import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { createPseudonymizer } from "../ai/guardrails";
import { getProvider } from "../ai/index";
import { AIProviderError } from "../ai/types";
import { demoActor } from "../lib/demoRole";
import { deniedMessage } from "./errors";
import { signalKind } from "./kinds";
import { MAX_QUESTION_LENGTH } from "./limits";
import {
  ASK_FIXTURE,
  ASK_SYSTEM,
  askSchema,
  buildAskPrompt,
  buildRecommendPrompt,
  RECOMMEND_SYSTEM,
  recommendFixture,
  recommendationSchema,
} from "./prompts";
import type { Recommendation } from "./signals";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export type HrAiFailure = {
  ok: false;
  code: string;
  message: string;
};

export type RecommendResult =
  | {
      ok: true;
      recommendations: Recommendation[];
      provider: string;
      interactionId: Id<"aiInteractions">;
    }
  | HrAiFailure;

export type AskResult =
  | {
      ok: true;
      answer: string;
      suggestions: string[];
      provider: string;
      interactionId: Id<"aiInteractions">;
    }
  | HrAiFailure;

const MESSAGES: Record<string, string> = {
  empty: "Wpisz pytanie.",
  too_long: `Pytanie jest za długie. Skróć je do ${MAX_QUESTION_LENGTH} znaków.`,
  config: "AI jest nieprawidłowo skonfigurowane. Sprawdź ustawienia serwera.",
  timeout: "AI niedostępne: odpowiedź trwała zbyt długo. Spróbuj ponownie.",
  unavailable: "AI niedostępne. Spróbuj ponownie za chwilę.",
  auth: "AI niedostępne: dostawca odrzucił dane dostępowe.",
  rate_limited: "AI niedostępne: zbyt wiele zapytań. Spróbuj ponownie później.",
  bad_response: "AI zwróciło nieoczekiwaną odpowiedź. Spróbuj ponownie.",
};

function failure(code: string, message?: string): HrAiFailure {
  return {
    ok: false,
    code,
    message: message ?? MESSAGES[code] ?? MESSAGES.unavailable ?? "",
  };
}

function toFailure(error: unknown, where: string): HrAiFailure {
  if (error instanceof AIProviderError) return failure(error.code);
  const refusal = deniedMessage(error);
  if (refusal) return failure("denied", refusal);
  // Name only: a provider error may echo the (pseudonymised) request.
  console.error(
    `${where} failed unexpectedly`,
    error instanceof Error ? error.name : typeof error,
  );
  return failure("unavailable");
}

// The model gets counts, dates and a placeholder instead of the name; it never sees the free text
// of an observation. Recommendations are saved on the signal so they survive a page reload.
export const recommend = action({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    kind: signalKind,
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<RecommendResult> => {
    try {
      const context = await ctx.runQuery(
        internal.hrPartner.queries.signalContext,
        args,
      );
      const person = context.employee;
      const pseudo = createPseudonymizer([
        `${person.firstName} ${person.lastName}`,
      ]);
      const prompt = pseudo.pseudonymize(
        buildRecommendPrompt({
          kind: args.kind,
          reason: context.signal.reason,
          position: person.position,
          facts: context.facts,
        }),
      );
      const provider = getProvider(parseAIConfig(process.env));
      const result = await provider.generateStructuredOutput({
        system: RECOMMEND_SYSTEM,
        prompt,
        schema: recommendationSchema,
        schemaName: "hrPartnerRecommendations",
        mockFixture: recommendFixture(args.kind),
      });
      const interactionId = await ctx.runMutation(
        internal.audit.mutations.recordAiInteraction,
        {
          module: "hrPartner.recommend",
          provider: result.provider,
          model: result.model,
          sentPrompt: prompt,
          output: JSON.stringify(result.data),
          actorId: context.supervisorId,
          employeeId: args.employeeId,
        },
      );
      const recommendations = result.data.recommendations.map((item) => ({
        text: pseudo.restore(item.text),
        kind: item.kind,
      }));
      await ctx.runMutation(internal.hrPartner.mutations.saveRecommendations, {
        supervisorId: context.supervisorId,
        employeeId: args.employeeId,
        kind: args.kind,
        reason: context.signal.reason,
        recommendations,
      });
      return {
        ok: true,
        recommendations,
        provider: result.provider,
        interactionId,
      };
    } catch (error) {
      return toFailure(error, "hrPartner.recommend");
    }
  },
});

// "Zapytaj HR partnera": a free question, optionally about one employee of the supervisor.
export const ask = action({
  args: {
    actor: demoActor,
    employeeId: v.optional(v.id("employees")),
    question: v.string(),
  },
  handler: async (ctx, args): Promise<AskResult> => {
    const question = args.question.trim();
    if (question === "") return failure("empty");
    if (question.length > MAX_QUESTION_LENGTH) return failure("too_long");
    try {
      const context = await ctx.runQuery(
        internal.hrPartner.queries.askContext,
        {
          actor: args.actor,
          employeeId: args.employeeId,
        },
      );
      // The employee the question is about comes first, so the model sees [PRACOWNIK] for them and
      // [PRACOWNIK_2], [PRACOWNIK_3], ... for everyone else.
      const focus = context.focus?.employee;
      const people = focus
        ? [
            focus,
            ...context.names.filter(
              (name) =>
                name.firstName !== focus.firstName ||
                name.lastName !== focus.lastName,
            ),
          ]
        : context.names;
      const pseudo = createPseudonymizer(
        people.map((person) => `${person.firstName} ${person.lastName}`),
      );
      const prompt = pseudo.pseudonymize(
        buildAskPrompt({
          question,
          focus: context.focus
            ? {
                position: context.focus.employee.position,
                signals: context.focus.signals,
                facts: context.focus.facts,
              }
            : null,
        }),
      );
      const provider = getProvider(parseAIConfig(process.env));
      const result = await provider.generateStructuredOutput({
        system: ASK_SYSTEM,
        prompt,
        schema: askSchema,
        schemaName: "hrPartnerAnswer",
        mockFixture: ASK_FIXTURE,
      });
      const interactionId = await ctx.runMutation(
        internal.audit.mutations.recordAiInteraction,
        {
          module: "hrPartner.ask",
          provider: result.provider,
          model: result.model,
          sentPrompt: prompt,
          output: JSON.stringify(result.data),
          actorId: context.supervisorId,
          employeeId: args.employeeId,
        },
      );
      const show = (text: string) => pseudo.restore(text);
      return {
        ok: true,
        answer: show(result.data.answer),
        suggestions: result.data.suggestions.map(show),
        provider: result.provider,
        interactionId,
      };
    } catch (error) {
      return toFailure(error, "hrPartner.ask");
    }
  },
});
