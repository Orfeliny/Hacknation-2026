import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { logAudit } from "../audit/log";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { expectedCriteria } from "../reviews/stages";
import { loadScope, requireAssessor } from "./access";
import { refusal } from "./errors";
import {
  DEVIATION_MESSAGE,
  NO_SUGGESTION_MESSAGE,
  justificationSchema,
} from "./limits";
import { COMPETENCY_MODEL, findCompetency, type Competency } from "./model";
import { linkOf, rowsFor } from "./rows";
import {
  choiceErrors,
  justificationRequired,
  type IndicatorChoice,
} from "./suggest";
import { suggestionFor } from "./view";

const ENTITY = "competencyAssessment";

function requireCompetency(competencyId: string): Competency {
  const competency = findCompetency(competencyId);
  if (!competency) {
    throw refusal(
      `Kompetencji „${competencyId}” nie ma w obecnej wersji modelu kompetencji.`,
    );
  }
  return competency;
}

const choicesKey = (choices: IndicatorChoice[]) =>
  choices.map((c) => `${c.indicatorId}=${c.levelId ?? ""}`).join(";");

// auditLog has a reviewId column only; a first review is named in the details.
const auditLink = (firstReviewId: Id<"firstReviews"> | undefined) =>
  firstReviewId ? ` firstReview=${firstReviewId}` : "";

async function loadForWrite(
  ctx: MutationCtx,
  resolved: ResolvedActor,
  assessmentId: Id<"competencyAssessments">,
) {
  const row = await ctx.db.get(assessmentId);
  if (!row) throw refusal("Nie znaleziono oceny kompetencji.");
  const scope = await loadScope(ctx.db, row.employeeId, linkOf(row));
  const me = requireAssessor(resolved, scope);
  return { row, scope, me, competency: requireCompetency(row.competencyId) };
}

// Starts the assessment of one competency, or returns the one already started, so the UI can call
// it every time the evaluator opens a competency. Pass reviewId (periodic review), firstReviewId
// (first review) or neither (ongoing feedback), never both.
export const open = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    competencyId: v.string(),
    reviewId: v.optional(v.id("reviews")),
    firstReviewId: v.optional(v.id("firstReviews")),
  },
  handler: async (
    ctx,
    { actor, employeeId, competencyId, reviewId, firstReviewId },
  ) => {
    const resolved = await resolveActor(ctx, actor);
    const link = { reviewId, firstReviewId };
    const scope = await loadScope(ctx.db, employeeId, link);
    const me = requireAssessor(resolved, scope);
    const competency = requireCompetency(competencyId);
    const context = scope.context;
    if (
      context?.kind === "review" &&
      context.doc.sheet &&
      competency.criterionId &&
      !expectedCriteria(context.doc).includes(competency.criterionId)
    ) {
      throw refusal(
        `Kryterium „${competency.name}” nie jest wybrane w tej ocenie okresowej.`,
      );
    }
    const existing = (await rowsFor(ctx.db, employeeId, link)).find(
      (r) => r.competencyId === competencyId,
    );
    if (existing) return existing._id;
    const assessmentId = await ctx.db.insert("competencyAssessments", {
      employeeId,
      assessorId: me,
      competencyId,
      criterionId: competency.criterionId,
      modelVersion: COMPETENCY_MODEL.modelVersion,
      reviewId,
      firstReviewId,
      indicatorChoices: [],
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      actor: resolved,
      action: "create",
      entity: ENTITY,
      entityId: assessmentId,
      reviewId,
      details: `competency=${competencyId}${auditLink(firstReviewId)}`,
    });
    return assessmentId;
  },
});

// Replaces all indicator choices. An indicator without a level, or left out, was not observed.
// Changed choices withdraw an earlier final level: the evaluator decides again on the new basis.
export const saveChoices = mutation({
  args: {
    actor: demoActor,
    assessmentId: v.id("competencyAssessments"),
    choices: v.array(
      v.object({ indicatorId: v.string(), levelId: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, { actor, assessmentId, choices }) => {
    const resolved = await resolveActor(ctx, actor);
    const { row, me, competency } = await loadForWrite(
      ctx,
      resolved,
      assessmentId,
    );
    const errors = choiceErrors({
      levels: COMPETENCY_MODEL.levels,
      indicatorIds: competency.indicators.map((i) => i.id),
      choices,
      rule: COMPETENCY_MODEL.suggestion,
    });
    if (errors.length > 0) throw refusal(errors.join(" "));
    const byIndicator = new Map(choices.map((c) => [c.indicatorId, c.levelId]));
    const normalized = competency.indicators.map((i) => {
      const levelId = byIndicator.get(i.id);
      return levelId === undefined
        ? { indicatorId: i.id }
        : { indicatorId: i.id, levelId };
    });
    const suggestion = suggestionFor(competency, normalized);
    const changed =
      row.modelVersion !== COMPETENCY_MODEL.modelVersion ||
      choicesKey(row.indicatorChoices ?? []) !== choicesKey(normalized);
    const withdrawFinal = changed && row.finalLevel !== undefined;
    await ctx.db.patch(assessmentId, {
      indicatorChoices: normalized,
      suggestedLevel: suggestion.levelId ?? undefined,
      modelVersion: COMPETENCY_MODEL.modelVersion,
      assessorId: me,
      updatedAt: Date.now(),
      ...(withdrawFinal && {
        finalLevel: undefined,
        deviationJustification: undefined,
      }),
    });
    await logAudit(ctx, {
      actor: resolved,
      action: "update",
      entity: ENTITY,
      entityId: assessmentId,
      reviewId: row.reviewId,
      details: `choices observed=${suggestion.observed}/${suggestion.total} suggested=${suggestion.levelId ?? "none"}${withdrawFinal ? " final=withdrawn" : ""}${auditLink(row.firstReviewId)}`,
    });
    return { suggestion, finalWithdrawn: withdrawFinal };
  },
});

// The evaluator's decision. The suggestion is recomputed here from the saved choices, so a client
// cannot pass its own suggestion to skip the justification.
export const setFinal = mutation({
  args: {
    actor: demoActor,
    assessmentId: v.id("competencyAssessments"),
    finalLevel: v.string(),
    deviationJustification: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { actor, assessmentId, finalLevel, deviationJustification },
  ) => {
    const resolved = await resolveActor(ctx, actor);
    const { row, me, competency } = await loadForWrite(
      ctx,
      resolved,
      assessmentId,
    );
    if (row.modelVersion !== COMPETENCY_MODEL.modelVersion) {
      throw refusal(
        "Model kompetencji zmienił się od ostatniego zapisu: sprawdź i zapisz ponownie wybory przy wskaźnikach.",
      );
    }
    if (!COMPETENCY_MODEL.levels.some((l) => l.id === finalLevel)) {
      throw refusal(`Nieznany poziom: ${finalLevel}.`);
    }
    const suggested = suggestionFor(competency, row.indicatorChoices).levelId;
    const deviation = justificationRequired(suggested, finalLevel);
    let justification: string | undefined;
    if (deviation) {
      const parsed = justificationSchema(
        suggested === null ? NO_SUGGESTION_MESSAGE : DEVIATION_MESSAGE,
      ).safeParse(deviationJustification ?? "");
      if (!parsed.success)
        throw refusal(parsed.error.issues.at(0)?.message ?? DEVIATION_MESSAGE);
      justification = parsed.data;
    }
    await ctx.db.patch(assessmentId, {
      finalLevel,
      suggestedLevel: suggested ?? undefined,
      deviationJustification: justification,
      assessorId: me,
      updatedAt: Date.now(),
    });
    await logAudit(ctx, {
      actor: resolved,
      action: "update",
      entity: ENTITY,
      entityId: assessmentId,
      reviewId: row.reviewId,
      details: `final=${finalLevel} suggested=${suggested ?? "none"} deviation=${deviation ? "yes" : "no"}${auditLink(row.firstReviewId)}`,
    });
    return { finalLevel, suggestedLevel: suggested, deviation };
  },
});
