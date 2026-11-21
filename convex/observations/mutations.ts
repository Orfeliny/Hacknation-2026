import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { assertIsoDate, isoDate } from "../lib/validators";
import { RULES_2016 } from "../rules/pack2016";
import { observationText } from "./limits";

const sentiment = v.union(
  v.literal("positive"),
  v.literal("development"),
  v.literal("neutral"),
);

function parseText(text: string): string {
  const parsed = observationText.safeParse(text);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  return parsed.data;
}

function checkCriterion(criterionId: string | undefined) {
  if (criterionId && !RULES_2016.catalog.some((c) => c.id === criterionId)) {
    throw new Error(`Nieznane kryterium: ${criterionId}.`);
  }
}

async function requireSupervisorOf(
  ctx: MutationCtx,
  me: Id<"employees"> | undefined,
  employeeId: Id<"employees">,
) {
  const employee = await ctx.db.get(employeeId);
  if (!employee) throw new Error("Nie znaleziono pracownika.");
  if (!me || employee.supervisorId !== me) {
    throw new Error("Obserwacje dodaje bezpośredni przełożony pracownika.");
  }
}

async function requireOwn(
  ctx: MutationCtx,
  me: Id<"employees"> | undefined,
  observationId: Id<"observations">,
) {
  const observation = await ctx.db.get(observationId);
  if (!observation || observation.authorId !== me) {
    throw new Error("Możesz zmieniać tylko własne obserwacje.");
  }
  return observation;
}

export const add = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    date: isoDate,
    text: v.string(),
    sentiment,
    criterionId: v.optional(v.string()),
    wellbeing: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { actor, employeeId, date, text, sentiment, criterionId, wellbeing },
  ) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    await requireSupervisorOf(ctx, me, employeeId);
    assertIsoDate(date, "date");
    checkCriterion(criterionId);
    return await ctx.db.insert("observations", {
      employeeId,
      authorId: me!,
      date,
      text: parseText(text),
      sentiment,
      criterionId,
      wellbeing,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    actor: demoActor,
    observationId: v.id("observations"),
    date: v.optional(isoDate),
    text: v.optional(v.string()),
    sentiment: v.optional(sentiment),
    criterionId: v.optional(v.string()),
    wellbeing: v.optional(v.boolean()),
  },
  handler: async (ctx, { actor, observationId, ...changes }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    await requireOwn(ctx, me, observationId);
    if (changes.date) assertIsoDate(changes.date, "date");
    checkCriterion(changes.criterionId);
    await ctx.db.patch(observationId, {
      ...changes,
      ...(changes.text !== undefined && { text: parseText(changes.text) }),
    });
  },
});

export const remove = mutation({
  args: { actor: demoActor, observationId: v.id("observations") },
  handler: async (ctx, { actor, observationId }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    await requireOwn(ctx, me, observationId);
    await ctx.db.delete(observationId);
  },
});

// The author's consent to hand chosen observations to the next evaluator (D11). Without it the
// successor sees nothing.
export const handOver = mutation({
  args: {
    actor: demoActor,
    observationIds: v.array(v.id("observations")),
    toEvaluatorId: v.id("employees"),
    reviewId: v.optional(v.id("reviews")),
  },
  handler: async (ctx, { actor, observationIds, toEvaluatorId, reviewId }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    if (toEvaluatorId === me)
      throw new Error("Nie możesz przekazać notatek samemu sobie.");
    const consentedAt = Date.now();
    for (const id of observationIds) {
      const observation = await requireOwn(ctx, me, id);
      await requireSuccessor(
        ctx,
        observation.employeeId,
        toEvaluatorId,
        reviewId,
      );
      await ctx.db.patch(id, {
        handover: { toEvaluatorId, consentedAt, reviewId },
      });
    }
    return observationIds.length;
  },
});

// The successor must be the employee's current supervisor or the evaluator of their open review,
// never the employee; a given review must belong to the same employee.
async function requireSuccessor(
  ctx: MutationCtx,
  employeeId: Id<"employees">,
  toEvaluatorId: Id<"employees">,
  reviewId: Id<"reviews"> | undefined,
) {
  if (toEvaluatorId === employeeId) {
    throw new Error("Notatek nie można przekazać osobie, której dotyczą.");
  }
  const employee = await ctx.db.get(employeeId);
  if (reviewId) {
    const review = await ctx.db.get(reviewId);
    if (!review || review.employeeId !== employeeId) {
      throw new Error("Ta ocena nie dotyczy tego pracownika.");
    }
  }
  const reviews = await ctx.db
    .query("reviews")
    .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
    .collect();
  const isEvaluator = reviews.some(
    (r) => r.stage !== "closed" && r.evaluatorId === toEvaluatorId,
  );
  if (employee?.supervisorId !== toEvaluatorId && !isEvaluator) {
    throw new Error(
      "Notatki można przekazać tylko nowemu przełożonemu albo oceniającemu.",
    );
  }
}

export const revokeHandover = mutation({
  args: { actor: demoActor, observationId: v.id("observations") },
  handler: async (ctx, { actor, observationId }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    await requireOwn(ctx, me, observationId);
    await ctx.db.patch(observationId, { handover: undefined });
  },
});
