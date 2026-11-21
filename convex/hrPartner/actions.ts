import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { getProvider } from "../ai/index";
import { AIProviderError } from "../ai/types";
import { demoActor } from "../lib/demoRole";
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
import { pseudonymize, restore } from "./pseudonymize";
import type { Recommendation } from "./signals";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export type HrAiFailure = {
  ok: false;
  code: string;
  message: string;
};

export type RecommendResult =
  | { ok: true; recommendations: Recommendation[]; provider: string }
  | HrAiFailure;

export type AskResult =
  | {
      ok: true;
      answer: string;
      suggestions: string[];
      provider: string;
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

// Our own user-facing messages: safe to show, unlike any other error text.
const DENIED = [
  "Sygnał jest już nieaktualny.",
  "Sygnały widzi przełożony pracownika.",
  "Sygnały HR partnera widzi przełożony pracownika.",
  "Dla wybranej roli nie ma przypisanego pracownika.",
];

function failure(code: string, message?: string): HrAiFailure {
  return {
    ok: false,
    code,
    message: message ?? MESSAGES[code] ?? MESSAGES.unavailable ?? "",
  };
}

function toFailure(error: unknown, where: string): HrAiFailure {
  if (error instanceof AIProviderError) return failure(error.code);
  const text = error instanceof Error ? error.message : "";
  const denied = DENIED.find((message) => text.includes(message));
  if (denied) return failure("denied", denied);
  console.error(`${where} failed unexpectedly`, error);
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
      const prompt = pseudonymize(
        buildRecommendPrompt({
          kind: args.kind,
          reason: context.signal.reason,
          position: person.position,
          facts: context.facts,
        }),
        [person],
      );
      const provider = getProvider(parseAIConfig(process.env));
      const result = await provider.generateStructuredOutput({
        system: RECOMMEND_SYSTEM,
        prompt,
        schema: recommendationSchema,
        schemaName: "hrPartnerRecommendations",
        mockFixture: recommendFixture(args.kind),
      });
      const recommendations = result.data.recommendations.map((item) => ({
        text: restore(item.text, person),
        kind: item.kind,
      }));
      await ctx.runMutation(internal.hrPartner.mutations.saveRecommendations, {
        supervisorId: context.supervisorId,
        employeeId: args.employeeId,
        kind: args.kind,
        reason: context.signal.reason,
        recommendations,
      });
      return { ok: true, recommendations, provider: result.provider };
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
      const prompt = pseudonymize(
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
        context.names,
      );
      const provider = getProvider(parseAIConfig(process.env));
      const result = await provider.generateStructuredOutput({
        system: ASK_SYSTEM,
        prompt,
        schema: askSchema,
        schemaName: "hrPartnerAnswer",
        mockFixture: ASK_FIXTURE,
      });
      const focus = context.focus?.employee;
      const show = (text: string) => (focus ? restore(text, focus) : text);
      return {
        ok: true,
        answer: show(result.data.answer),
        suggestions: result.data.suggestions.map(show),
        provider: result.provider,
      };
    } catch (error) {
      return toFailure(error, "hrPartner.ask");
    }
  },
});
