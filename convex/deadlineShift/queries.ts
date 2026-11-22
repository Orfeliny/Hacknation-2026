import { query } from "../_generated/server";
import { resolveActor } from "../lib/demoRole";
import {
  getContract,
  listAwaitingNoticeContract,
  listForEmployeeContract,
  listForSupervisorContract,
} from "../lib/contracts/deadlineShift";
import {
  canViewReviewShifts,
  isHr,
  toShiftRequest,
  toShiftRequests,
} from "./shared";

export const listForSupervisor = query({
  ...listForSupervisorContract,
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    if (resolved.role !== "supervisor" || !resolved.employee) return [];
    const me = resolved.employee._id;
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_evaluator", (q) => q.eq("evaluatorId", me))
      .collect();
    const rows = await toShiftRequests(
      ctx,
      reviews,
      (e) => e.reason === "employee_request",
    );
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listAwaitingNotice = query({
  ...listAwaitingNoticeContract,
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    if (!isHr(resolved)) return [];
    const reviews = await ctx.db.query("reviews").collect();
    const rows = await toShiftRequests(
      ctx,
      reviews,
      (e) => e.status !== "requested" && e.noticeSentAt === undefined,
    );
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const listForEmployee = query({
  ...listForEmployeeContract,
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    const reviews = (
      await ctx.db
        .query("reviews")
        .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
        .collect()
    ).filter((r) => canViewReviewShifts(resolved, r));
    const rows = await toShiftRequests(ctx, reviews, () => true);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  ...getContract,
  handler: async (ctx, { actor, reviewId, changeIndex }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review || !canViewReviewShifts(resolved, review)) return null;
    return toShiftRequest(ctx, review, changeIndex);
  },
});
