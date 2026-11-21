import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { computeDeadlines } from "../rules/deadlines";
import { RULES_2016 } from "../rules/pack2016";

export const todayIso = () => new Date().toISOString().slice(0, 10);

const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// The last closed review of the employee; it starts the next cycle.
export async function lastClosedReview(
  ctx: Pick<QueryCtx, "db">,
  employeeId: Doc<"employees">["_id"],
): Promise<Doc<"reviews"> | undefined> {
  const rows = await ctx.db
    .query("reviews")
    .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
    .collect();
  return rows
    .filter((r) => r.stage === "closed" && r.endReason !== "annulled")
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))[0];
}

export function cycleStartFor(
  employee: Doc<"employees">,
  previous: Doc<"reviews"> | undefined,
  today: string,
): string {
  if (previous?.closedAt) return isoOf(previous.closedAt);
  return employee.indefiniteEmploymentSince ?? today;
}

export function dueDateFor(
  employee: Doc<"employees">,
  cycleStart: string,
  previousResult: "positive" | "negative" | undefined,
): string {
  const absences = (employee.staffingEvents ?? [])
    .filter((e) => e.kind === "long_absence" && e.to)
    .map((e) => ({ from: e.from, to: e.to! }));
  const deadlines = computeDeadlines(
    { cycleStart, previousResult, absences },
    RULES_2016,
  );
  return deadlines.find((d) => d.kind === "review")!.date;
}

export async function reviewContext(
  ctx: Pick<QueryCtx, "db">,
  review: Doc<"reviews">,
  employee: Doc<"employees">,
  today: string,
) {
  const previous = review.previousReviewId
    ? ((await ctx.db.get(review.previousReviewId)) ?? undefined)
    : undefined;
  return {
    today,
    cycleStart: cycleStartFor(employee, previous, today),
    previousResult: previous?.overallResult,
  };
}
