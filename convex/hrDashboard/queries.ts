import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { compareDates } from "../rules/dates";
import { RULES_2016 } from "../rules/pack2016";
import { deadlinesFor } from "./planner";

// Statistics never show a group smaller than this (#17).
export const MIN_GROUP_SIZE = 3;

const todayIso = () => new Date().toISOString().slice(0, 10);

async function visibleReviews(ctx: QueryCtx, actor: ResolvedActor) {
  if (
    actor.role === "hr" ||
    actor.role === "director" ||
    actor.role === "admin"
  ) {
    return await ctx.db.query("reviews").collect();
  }
  const me = actor.employee?._id;
  if (!me) return [];
  if (actor.role === "supervisor") {
    return await ctx.db
      .query("reviews")
      .withIndex("by_evaluator", (q) => q.eq("evaluatorId", me))
      .collect();
  }
  return await ctx.db
    .query("reviews")
    .withIndex("by_employee", (q) => q.eq("employeeId", me))
    .collect();
}

// Status of every review the actor may see: stage, due date and whether it is late.
export const statusBoard = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const today = todayIso();
    const rows = [];
    for (const review of await visibleReviews(ctx, resolved)) {
      const employee = await ctx.db.get(review.employeeId);
      if (!employee) continue;
      const evaluator = await ctx.db.get(review.evaluatorId);
      const previous = review.previousReviewId
        ? await ctx.db.get(review.previousReviewId)
        : null;
      const due = deadlinesFor(review, employee, previous).find(
        (d) => d.kind === "review",
      );
      const dueDate = review.dueDate ?? due?.date ?? null;
      rows.push({
        reviewId: review._id,
        employeeId: employee._id,
        employee: `${employee.firstName} ${employee.lastName}`,
        unit: employee.unit,
        evaluator: evaluator
          ? `${evaluator.firstName} ${evaluator.lastName}`
          : null,
        sheet: review.sheet ?? null,
        stage: review.stage,
        dueDate,
        overdue:
          review.stage !== "closed" &&
          dueDate !== null &&
          compareDates(today, dueDate) > 0,
      });
    }
    return rows.sort((a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    );
  },
});

export const myReminders = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = resolved.employee?._id;
    if (!me) return [];
    const rows = await ctx.db
      .query("reminders")
      .withIndex("by_recipient", (q) => q.eq("recipientId", me))
      .collect();
    return rows
      .filter((r) => r.dismissedAt === undefined)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

type Bucket =
  { label: string; count: number } | { label: string; hidden: true };

function bucket(label: string, count: number): Bucket {
  return count > 0 && count < MIN_GROUP_SIZE
    ? { label, hidden: true }
    : { label, count };
}

// Aggregates only, for HR and the director: no names, small groups hidden.
export const stats = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    if (!["hr", "director", "admin"].includes(resolved.role)) {
      throw new Error("Statystyki są dostępne dla kadr i kierownictwa.");
    }
    const reviews = await ctx.db.query("reviews").collect();
    const closed = reviews.filter(
      (r) => r.stage === "closed" && r.overallLevelId,
    );
    const levels = RULES_2016.overallLevels.map((level) =>
      bucket(
        level.label,
        closed.filter((r) => r.overallLevelId === level.id).length,
      ),
    );
    const onTime = closed.filter(
      (r) =>
        r.dueDate &&
        r.closedAt &&
        new Date(r.closedAt).toISOString().slice(0, 10) <= r.dueDate,
    ).length;
    const additional = new Map<string, number>();
    for (const r of reviews) {
      for (const id of r.additionalCriteria ?? [])
        additional.set(id, (additional.get(id) ?? 0) + 1);
    }
    const areas = new Map<string, number>();
    for (const r of closed) {
      for (const area of r.developmentPlan?.areas ?? []) {
        if (area.criterionId)
          areas.set(area.criterionId, (areas.get(area.criterionId) ?? 0) + 1);
      }
    }
    const top = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) =>
          bucket(
            RULES_2016.catalog.find((c) => c.id === id)?.name ?? id,
            count,
          ),
        );
    const byStage = new Map<Doc<"reviews">["stage"], number>();
    for (const r of reviews)
      byStage.set(r.stage, (byStage.get(r.stage) ?? 0) + 1);
    return {
      total: reviews.length,
      closed: closed.length,
      onTimeShare:
        closed.length >= MIN_GROUP_SIZE ? onTime / closed.length : null,
      levels,
      byStage: [...byStage.entries()].map(([stage, count]) =>
        bucket(stage, count),
      ),
      topAdditionalCriteria: top(additional),
      topDevelopmentAreas: top(areas),
    };
  },
});
