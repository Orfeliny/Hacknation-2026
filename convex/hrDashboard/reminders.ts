import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { addDays } from "../rules/dates";
import { RULES_2016 } from "../rules/pack2016";
import { inAppChannel } from "./notifications";
import { deadlinesFor, planReminders, type PlannedReminder } from "./planner";

const TOP_LEVELS = new Set(
  RULES_2016.overallLevels.slice(-2).map((level) => level.id as string),
);

const todayIso = () => new Date().toISOString().slice(0, 10);

async function insertOnce(
  ctx: MutationCtx,
  plan: PlannedReminder,
): Promise<boolean> {
  const existing = await ctx.db
    .query("reminders")
    .withIndex("by_review_stage_kind", (q) =>
      q
        .eq("reviewId", plan.reviewId)
        .eq("stage", plan.stage)
        .eq("kind", plan.kind),
    )
    .collect();
  if (
    existing.some(
      (r) => r.recipientId === plan.recipientId && r.dueDate === plan.dueDate,
    )
  ) {
    return false;
  }
  const delivery = inAppChannel.deliver(plan);
  await ctx.db.insert("reminders", {
    ...plan,
    createdAt: Date.now(),
    sentAt: delivery.delivered ? Date.now() : undefined,
  });
  return true;
}

// art. 89 ust. 2: an official with two consecutive positive reviews on the two highest levels
// gets the next grade within 30 days of acknowledging the second one.
export function earnsMandatoryPromotion(
  closedReviews: Doc<"reviews">[],
): boolean {
  const lastTwo = [...closedReviews]
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0))
    .slice(-2);
  return (
    lastTwo.length === 2 &&
    lastTwo.every(
      (r) =>
        r.overallResult === "positive" &&
        TOP_LEVELS.has(r.overallLevelId ?? ""),
    )
  );
}

// Runs daily from convex/crons.ts. `today` lets the demo jump in time.
export const generate = internalMutation({
  args: { today: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const today = args.today ?? todayIso();
    let created = 0;
    const reviews = await ctx.db.query("reviews").collect();
    const hrPeople = await ctx.db
      .query("employees")
      .withIndex("by_demoPersona", (q) => q.eq("demoPersona", "hr"))
      .collect();

    for (const review of reviews) {
      if (review.stage === "closed") continue;
      const employee = await ctx.db.get(review.employeeId);
      if (!employee) continue;
      const previous = review.previousReviewId
        ? await ctx.db.get(review.previousReviewId)
        : null;
      for (const plan of planReminders(
        review,
        deadlinesFor(review, employee, previous),
        today,
      )) {
        if (await insertOnce(ctx, plan)) created++;
      }
    }

    const byEmployee = new Map<Id<"employees">, Doc<"reviews">[]>();
    for (const review of reviews) {
      if (review.stage !== "closed") continue;
      byEmployee.set(review.employeeId, [
        ...(byEmployee.get(review.employeeId) ?? []),
        review,
      ]);
    }
    for (const [employeeId, closed] of byEmployee) {
      const employee = await ctx.db.get(employeeId);
      if (
        employee?.corpsRole !== "official" ||
        !earnsMandatoryPromotion(closed)
      )
        continue;
      const latest = closed.reduce((a, b) =>
        (a.closedAt ?? 0) > (b.closedAt ?? 0) ? a : b,
      );
      const acknowledged = latest.signatures?.find(
        (s) => s.role === "employee" && s.scope === "assessment",
      );
      const from = new Date(
        acknowledged?.signedAt ?? latest.closedAt ?? Date.now(),
      )
        .toISOString()
        .slice(0, 10);
      const dueDate = addDays(from, RULES_2016.mandatoryPromotionDays);
      for (const hr of hrPeople) {
        const inserted = await insertOnce(ctx, {
          recipientId: hr._id,
          reviewId: latest._id,
          kind: "upcoming",
          stage: "mandatory_promotion",
          dueDate,
          message: `${employee.firstName} ${employee.lastName}: obowiązek przyznania kolejnego stopnia służbowego do ${dueDate} (art. 89 ust. 2).`,
        });
        if (inserted) created++;
      }
    }
    return { created, today };
  },
});
