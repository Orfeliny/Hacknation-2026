import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";
import type { Audience, Context, Link } from "./access";
import { finalVisibleToEmployee } from "./access";

type Assessment = Doc<"competencyAssessments">;

export const linkOf = (row: Assessment): Link => ({
  reviewId: row.reviewId,
  firstReviewId: row.firstReviewId,
});

// Rows of one employee that belong to exactly the given review, first review, or neither.
export async function rowsFor(
  db: DatabaseReader,
  employeeId: Id<"employees">,
  { reviewId, firstReviewId }: Link,
): Promise<Assessment[]> {
  const rows = reviewId
    ? await db
        .query("competencyAssessments")
        .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
        .collect()
    : firstReviewId
      ? await db
          .query("competencyAssessments")
          .withIndex("by_firstReview", (q) =>
            q.eq("firstReviewId", firstReviewId),
          )
          .collect()
      : await db
          .query("competencyAssessments")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect();
  return rows.filter(
    (r) =>
      r.employeeId === employeeId &&
      r.reviewId === reviewId &&
      r.firstReviewId === firstReviewId,
  );
}

export function visibleRows(
  rows: Assessment[],
  audience: Audience,
  context: Context,
): Assessment[] {
  if (audience !== "employee") return rows;
  if (!finalVisibleToEmployee(context)) return [];
  return rows.filter((r) => r.finalLevel !== undefined);
}
