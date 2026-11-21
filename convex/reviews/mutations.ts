import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { assertIsoDate, staffingSituation } from "../lib/validators";
import {
  computeAssessment,
  pickSheet,
  validateAdditionalCriteria,
} from "../rules/assessment";
import { RULES_2016 } from "../rules/pack2016";
import { isSubjectToReview } from "../rules/validateReview";
import { canViewReview, isEvaluator, isReviewed } from "./access";
import {
  cycleStartFor,
  dueDateFor,
  lastClosedReview,
  reviewContext,
  todayIso,
} from "./context";
import { startableEmployees } from "./queries";
import {
  EDITABLE_STAGES,
  FIELD_STAGE,
  STAGE_LABELS,
  blockingGaps,
  expectedCriteria,
  formatGaps,
  nextStage,
  stepGaps,
} from "./stages";
import { reviewsTables } from "./tables";

const fields = reviewsTables.reviews.validator.fields;
const fail = (message: string): never => {
  throw new ConvexError(message);
};

async function load(
  ctx: MutationCtx,
  actor: ResolvedActor,
  reviewId: Doc<"reviews">["_id"],
) {
  const review = await ctx.db.get(reviewId);
  if (!review || !canViewReview(actor, review)) {
    return fail("Nie znaleziono oceny.");
  }
  const employee = (await ctx.db.get(review.employeeId))!;
  return { review, employee };
}

function pushStage(review: Doc<"reviews">, stage: Doc<"reviews">["stage"]) {
  return [...(review.stageHistory ?? []), { stage, at: Date.now() }];
}

export const start = mutation({
  args: { actor: demoActor, employeeId: v.id("employees") },
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    const employee = await ctx.db.get(employeeId);
    const allowed = (await startableEmployees(ctx, resolved)).some(
      (e) => e._id === employeeId,
    );
    if (!employee) return fail("Nie znaleziono pracownika.");
    if (!isSubjectToReview(employee)) {
      return fail(
        "Pracownik na umowie na czas określony nie podlega ocenie okresowej (art. 81 ust. 1).",
      );
    }
    if (!allowed || !employee.supervisorId) {
      return fail(
        "Nie można rozpocząć oceny: brak uprawnień, pracownik nie ma przełożonego albo ma ocenę w toku.",
      );
    }
    const today = todayIso();
    const previous = await lastClosedReview(ctx, employeeId);
    const cycleStart = cycleStartFor(employee, previous, today);
    const now = Date.now();
    return await ctx.db.insert("reviews", {
      employeeId,
      evaluatorId: employee.supervisorId,
      stage: "opening",
      createdAt: now,
      updatedAt: now,
      sheet: pickSheet(employee.positionKind ?? "non_managerial"),
      rulesVersion: RULES_2016.version,
      previousReviewId: previous?._id,
      dueDate: dueDateFor(employee, cycleStart, previous?.overallResult),
      previousReview:
        employee.corpsRole === "official"
          ? {
              result: previous?.overallResult ?? "none",
              levelId: previous?.overallLevelId,
              date: previous?.closedAt
                ? new Date(previous.closedAt).toISOString().slice(0, 10)
                : undefined,
            }
          : undefined,
      staffingSituations: employee.staffingEvents ?? [],
      signatures: [],
      stageHistory: [{ stage: "opening", at: now }],
    });
  },
});

const patchArgs = v.object({
  additionalCriteria: fields.additionalCriteria,
  openingConversationDate: fields.openingConversationDate,
  expectations: fields.expectations,
  periodStart: fields.periodStart,
  periodEnd: fields.periodEnd,
  evaluationConversationDate: fields.evaluationConversationDate,
  ratings: fields.ratings,
  overallJustification: fields.overallJustification,
  developmentPlan: fields.developmentPlan,
  promotionRequest: fields.promotionRequest,
  staffingSituations: v.optional(v.array(staffingSituation)),
});

export const save = mutation({
  args: { actor: demoActor, reviewId: v.id("reviews"), patch: patchArgs },
  handler: async (ctx, { actor, reviewId, patch }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review } = await load(ctx, resolved, reviewId);
    if (!isEvaluator(resolved, review)) {
      return fail("Ocenę edytuje tylko oceniający.");
    }
    if (!EDITABLE_STAGES.includes(review.stage)) {
      return fail(
        "Ocena jest już po etapie sporządzania i nie można jej edytować.",
      );
    }
    const partOneSigned = (review.signatures ?? []).some(
      (s) => s.scope === "part_one",
    );
    const update: Partial<Doc<"reviews">> = {};
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
      const value = patch[key];
      if (value === undefined) continue;
      if (key !== "staffingSituations") {
        const stage = FIELD_STAGE[key];
        if (review.stage !== stage) {
          return fail(
            `To pole edytuje się na etapie „${STAGE_LABELS[stage]}”, a ocena jest na etapie „${STAGE_LABELS[review.stage]}”.`,
          );
        }
        if (stage === "opening" && partOneSigned) {
          return fail(
            "Część I została już potwierdzona, więc kryteria, data i oczekiwania są zablokowane.",
          );
        }
      }
      (update as Record<string, unknown>)[key] = value;
    }
    for (const key of [
      "openingConversationDate",
      "periodStart",
      "periodEnd",
      "evaluationConversationDate",
    ] as const) {
      if (update[key]) assertIsoDate(update[key], key);
    }
    if (update.staffingSituations) {
      if (review.stage !== "observation") {
        return fail(
          `Sytuacje kadrowe edytuje się na etapie „${STAGE_LABELS.observation}”.`,
        );
      }
      const before = review.staffingSituations ?? [];
      const kept = before.every((old, i) => {
        const now = update.staffingSituations![i];
        return (
          now !== undefined &&
          now.kind === old.kind &&
          now.from === old.from &&
          now.to === old.to
        );
      });
      if (!kept) {
        return fail(
          "Zapisanych sytuacji kadrowych nie można usuwać ani zmieniać ich rodzaju i dat; uzupełnia się tylko uwagi.",
        );
      }
    }
    for (const s of update.staffingSituations ?? []) {
      assertIsoDate(s.from, "staffingSituations.from");
      if (s.to) assertIsoDate(s.to, "staffingSituations.to");
    }
    if (update.promotionRequest?.currentGradeSince) {
      assertIsoDate(
        update.promotionRequest.currentGradeSince,
        "promotionRequest.currentGradeSince",
      );
    }
    const merged = { ...review, ...update };
    if (update.additionalCriteria) {
      const errors = validateAdditionalCriteria(
        merged.sheet!,
        update.additionalCriteria,
        RULES_2016,
      );
      if (errors.length > 0)
        return fail(errors.map((e) => e.message).join(" "));
    }
    const expected = new Set(expectedCriteria(merged));
    if (update.expectations) {
      const unknown = update.expectations.find(
        (e) => !expected.has(e.criterionId),
      );
      if (unknown)
        return fail(
          `Oczekiwania dotyczą nieznanego kryterium: ${unknown.criterionId}.`,
        );
    }
    if (update.ratings) {
      const allowed = new Set(RULES_2016.partialScale.map((l) => l.id));
      const seen = new Set<string>();
      for (const r of update.ratings) {
        if (!expected.has(r.criterionId)) {
          return fail(
            `Ocena dotyczy kryterium spoza arkusza: ${r.criterionId}.`,
          );
        }
        if (!allowed.has(r.levelId)) {
          return fail(`Niedozwolona ocena cząstkowa „${r.levelId}”.`);
        }
        if (seen.has(r.criterionId)) {
          return fail(`Kryterium ${r.criterionId} ocenione dwa razy.`);
        }
        seen.add(r.criterionId);
      }
      const complete = [...expected].every((id) => seen.has(id));
      if (complete) {
        const result = computeAssessment(
          update.ratings.map((r) => Number(r.levelId)),
          {
            isOfficial:
              (await ctx.db.get(review.employeeId))?.corpsRole === "official",
          },
          RULES_2016,
        );
        update.averageScore = result.average;
        update.overallResult = result.result;
        update.overallLevelId = result.levelId;
      } else {
        update.averageScore = undefined;
        update.overallResult = undefined;
        update.overallLevelId = undefined;
      }
    }
    await ctx.db.patch(reviewId, { ...update, updatedAt: Date.now() });
  },
});

export const sign = mutation({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    scope: v.union(v.literal("part_one"), v.literal("assessment")),
    place: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, { actor, reviewId, scope, place, remarks }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review, employee } = await load(ctx, resolved, reviewId);
    const asEvaluator = isEvaluator(resolved, review);
    const asEmployee = isReviewed(resolved, review);
    if (!asEvaluator && !asEmployee) return fail("Tej oceny nie podpisujesz.");
    const role: "evaluator" | "employee" = asEvaluator
      ? "evaluator"
      : "employee";
    const stage = scope === "part_one" ? "opening" : "signing";
    if (review.stage !== stage) {
      return fail(
        `Ten podpis składa się na etapie „${STAGE_LABELS[stage]}”, a ocena jest na etapie „${STAGE_LABELS[review.stage]}”.`,
      );
    }
    if (!place.trim()) return fail("Podaj miejscowość.");
    const signatures = review.signatures ?? [];
    const has = (r: "evaluator" | "employee") =>
      signatures.some(
        (s) => s.role === r && (s.scope ?? "assessment") === scope,
      );
    if (has(role)) return fail("Ten podpis został już złożony.");
    if (scope === "part_one") {
      const gaps = stepGaps(review);
      if (gaps.length > 0) {
        return fail(
          `Przed potwierdzeniem części I uzupełnij:\n${gaps.map((g) => `- ${g.message}`).join("\n")}`,
        );
      }
    } else if (role === "employee" && !has("evaluator")) {
      return fail("Oceniany podpisuje dopiero po oceniającym.");
    }
    const next = [
      ...signatures,
      {
        role,
        signerId: resolved.employee!._id,
        signedAt: Date.now(),
        scope,
        place: place.trim(),
        remarks: remarks?.trim() || undefined,
        method: "in_app" as const,
      },
    ];
    const patch: Partial<Doc<"reviews">> = {
      signatures: next,
      updatedAt: Date.now(),
    };
    if (scope === "assessment" && role === "employee") {
      const updated = { ...review, signatures: next };
      const context = await reviewContext(ctx, review, employee, todayIso());
      const gaps = blockingGaps(
        { ...updated, stage: "signing" },
        employee,
        context,
      );
      if (gaps.length > 0) return fail(formatGaps(gaps));
      patch.stage = "objection_window";
      patch.stageHistory = pushStage(review, "objection_window");
    }
    await ctx.db.patch(reviewId, patch);
  },
});

export const advance = mutation({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review, employee } = await load(ctx, resolved, reviewId);
    if (!isEvaluator(resolved, review))
      return fail("Ocenę prowadzi tylko oceniający.");
    const target = nextStage(review.stage);
    if (
      !["opening", "observation", "evaluation", "writing"].includes(
        review.stage,
      ) ||
      !target
    ) {
      return fail("Z tego etapu nie można przejść dalej przyciskiem.");
    }
    const context = await reviewContext(ctx, review, employee, todayIso());
    const gaps = blockingGaps(review, employee, context);
    if (gaps.length > 0) return fail(formatGaps(gaps));
    await ctx.db.patch(reviewId, {
      stage: target,
      stageHistory: pushStage(review, target),
      updatedAt: Date.now(),
    });
  },
});

export const close = mutation({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review, employee } = await load(ctx, resolved, reviewId);
    if (
      !isEvaluator(resolved, review) &&
      resolved.role !== "hr" &&
      resolved.role !== "admin"
    ) {
      return fail("Ocenę zamyka oceniający albo kadry.");
    }
    if (review.stage !== "objection_window") {
      return fail("Zamknąć można ocenę po złożeniu podpisów.");
    }
    const context = await reviewContext(ctx, review, employee, todayIso());
    const gaps = blockingGaps(review, employee, context);
    if (gaps.length > 0) return fail(formatGaps(gaps));
    const now = Date.now();
    await ctx.db.patch(reviewId, {
      stage: "closed",
      stageHistory: pushStage(review, "closed"),
      closedAt: now,
      endReason: "completed",
      updatedAt: now,
    });
  },
});
