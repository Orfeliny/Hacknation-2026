import { ConvexError, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalQuery } from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { getProvider } from "../ai/index";
import { AIProviderError } from "../ai/types";
import { askContract, KNOWLEDGE_LIMITS } from "../lib/contracts/knowledgeDocs";
import { demoActor, resolveActor } from "../lib/demoRole";
import {
  ANSWER_SYSTEM,
  answerFixture,
  answerSchema,
  buildAnswerPrompt,
  CONFLICT_NOTE,
  labelOf,
} from "./prompts";
import { runSearch, type KnowledgeHit } from "./search";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

type AskResult = Infer<typeof askContract.returns>;

const EXCERPT_CHARS = 300;

const MESSAGES: Record<string, string> = {
  config: "AI jest nieprawidłowo skonfigurowane. Sprawdź ustawienia serwera.",
  timeout: "AI niedostępne: odpowiedź trwała zbyt długo. Spróbuj ponownie.",
  unavailable: "AI niedostępne. Spróbuj ponownie za chwilę.",
  auth: "AI niedostępne: dostawca odrzucił dane dostępowe.",
  rate_limited: "AI niedostępne: zbyt wiele zapytań. Spróbuj ponownie później.",
  bad_response: "AI zwróciło nieoczekiwaną odpowiedź. Spróbuj ponownie.",
};

// Refusals are ConvexError: Convex hides the text of a plain Error in production.
function toError(
  error: unknown,
): ConvexError<{ code: string; message: string }> {
  if (error instanceof ConvexError) return error as never;
  if (error instanceof AIProviderError) {
    // The guardrail error carries its own safe Polish message.
    const message =
      error.code === "guardrail"
        ? error.message
        : (MESSAGES[error.code] ?? MESSAGES.unavailable ?? "");
    return new ConvexError({ code: error.code, message });
  }
  // Name only: a provider error may echo the request.
  console.error(
    "knowledge.ask failed unexpectedly",
    error instanceof Error ? error.name : typeof error,
  );
  return new ConvexError({
    code: "unavailable",
    message: MESSAGES.unavailable ?? "",
  });
}

// Who is asking: only the unit and the id are needed, so the action never sees more of the employee.
export const askerContext = internalQuery({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const { employee } = await resolveActor(ctx, actor);
    return { employeeId: employee?._id, unit: employee?.unit };
  },
});

const excerptOf = (text: string) =>
  text.replace(/\s+/g, " ").trim().slice(0, EXCERPT_CHARS);

// Answers from the published documents only and cites the chunks it used. When nothing in the sources
// supports an answer, `answer` is null and the page shows "Nie znalazłem tego w bazie wiedzy"; the model
// is not even called when no chunk passes the threshold.
export const ask = action({
  ...askContract,
  handler: async (ctx, { actor, question }): Promise<AskResult> => {
    const text = question.trim();
    if (text.length === 0 || text.length > KNOWLEDGE_LIMITS.question) {
      throw new ConvexError({
        code: "invalid",
        message: `Pytanie musi mieć od 1 do ${KNOWLEDGE_LIMITS.question} znaków.`,
      });
    }
    try {
      const asker = await ctx.runQuery(
        internal.knowledge.assistant.askerContext,
        {
          actor,
        },
      );
      const hits = await runSearch(ctx, { question: text, unit: asker.unit });
      if (hits.length === 0) return { answer: null, citations: [] };

      const provider = getProvider(parseAIConfig(process.env));
      const prompt = buildAnswerPrompt(text, hits);
      const result = await provider.generateStructuredOutput({
        system: ANSWER_SYSTEM,
        prompt,
        schema: answerSchema,
        schemaName: "knowledgeAnswer",
        mockFixture: answerFixture(hits),
      });
      await ctx.runMutation(internal.audit.mutations.recordAiInteraction, {
        module: "knowledge.ask",
        provider: result.provider,
        model: result.model,
        sentPrompt: prompt,
        output: JSON.stringify(result.data),
        ...(asker.employeeId && { actorId: asker.employeeId }),
      });

      const used = new Set(result.data.sources);
      const cited = hits.filter((_, index) => used.has(labelOf(index)));
      if (
        !result.data.found ||
        cited.length === 0 ||
        !result.data.answer.trim()
      ) {
        return { answer: null, citations: [] };
      }
      const conflict = isPossibleConflict(hits);
      // On a conflict both sides are shown: the best hit of each kind is cited even if the model used one.
      const shown = conflict
        ? hits.filter(
            (hit, index) =>
              used.has(labelOf(index)) ||
              hit === hits.find((other) => other.kind === hit.kind),
          )
        : cited;
      return {
        answer: conflict
          ? `${result.data.answer.trim()}\n\n${CONFLICT_NOTE}`
          : result.data.answer.trim(),
        citations: shown.map((hit) => ({
          kind: hit.kind,
          title: hit.title,
          locator: hit.locator,
          documentId: hit.documentId,
          excerpt: excerptOf(hit.text),
        })),
        ...(conflict && { possibleConflict: true }),
      };
    } catch (error) {
      throw toError(error);
    }
  },
});

// A national source and an office or unit source both matched: the requirements may differ, so the
// answer asks for a manual check. It is a rule on the scopes, not a judgement of the content.
export function isPossibleConflict(hits: KnowledgeHit[]): boolean {
  return (
    hits.some((hit) => hit.kind === "law") &&
    hits.some((hit) => hit.kind === "office")
  );
}
