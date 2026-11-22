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
  fitHits,
  CONFLICT_NOTE,
  labelOf,
} from "./prompts";
import { runSearch, type KnowledgeHit } from "./search";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

type AskResult = Infer<typeof askContract.returns>;

const EXCERPT_CHARS = 300;

// A blocked answer repeats when the question is asked again, so the message says what to change.
const GUARDRAIL_MESSAGE =
  "Nie mogę podać odpowiedzi, która wskazuje poziom oceny. Zapytaj o przepisy lub tryb postępowania.";

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
        ? GUARDRAIL_MESSAGE
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
      const found = await runSearch(ctx, { question: text, unit: asker.unit });
      if (found.length === 0) return { answer: null, citations: [] };
      const sent = fitHits(found);

      const provider = getProvider(parseAIConfig(process.env));
      const prompt = buildAnswerPrompt(text, sent);
      const result = await provider.generateStructuredOutput({
        system: ANSWER_SYSTEM,
        prompt,
        schema: answerSchema,
        schemaName: "knowledgeAnswer",
        mockFixture: answerFixture(sent),
      });
      await ctx.runMutation(internal.audit.mutations.recordAiInteraction, {
        module: "knowledge.ask",
        provider: result.provider,
        model: result.model,
        sentPrompt: prompt,
        output: JSON.stringify(result.data),
        ...(asker.employeeId && { actorId: asker.employeeId }),
      });

      const decision = decideCitations(sent, result.data.sources);
      if (
        !result.data.found ||
        decision === null ||
        !result.data.answer.trim()
      ) {
        return { answer: null, citations: [] };
      }
      const { shown, conflict } = decision;
      return {
        answer: conflict
          ? `${result.data.answer.trim()}

${CONFLICT_NOTE}`
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

// Another kind of source this close to the best cited one counts as a competing requirement.
export const CONFLICT_MARGIN = 0.1;

// Maps the labels the model named back to the hits it was given (labels it did not get are dropped; none
// left gives null). A possible conflict is a rule on the scopes, not a judgement of the content: the model
// cited both kinds, or a source of the other kind scored within CONFLICT_MARGIN of the best cited one. That
// source is then cited too, so both sides are shown.
export function decideCitations(
  hits: KnowledgeHit[],
  labels: string[],
): { shown: KnowledgeHit[]; conflict: boolean } | null {
  const named = new Set(labels);
  const cited = hits.filter((_, index) => named.has(labelOf(index)));
  if (cited.length === 0) return null;
  const kinds = new Set(cited.map((hit) => hit.kind));
  const best = Math.max(...cited.map((hit) => hit.score));
  const rival =
    kinds.size === 1
      ? hits.find(
          (hit) => !kinds.has(hit.kind) && hit.score >= best - CONFLICT_MARGIN,
        )
      : undefined;
  const conflict = kinds.size > 1 || rival !== undefined;
  return {
    shown: hits.filter((hit) => cited.includes(hit) || hit === rival),
    conflict,
  };
}
