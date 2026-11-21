import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { canReadObservation } from "../observations/access";
import { criteriaForSheet } from "../rules/assessment";
import { RULES_2016 } from "../rules/pack2016";
import { canReadConversation } from "./access";

export const listForEmployee = query({
  args: { actor: demoActor, employeeId: v.id("employees") },
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    const rows = await ctx.db
      .query("conversations")
      .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
      .collect();
    return rows
      .filter((c) => canReadConversation(resolved, c))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Everything the AI action needs, already filtered to what the author may read (D11).
export const promptContext = internalQuery({
  args: { actor: demoActor, conversationId: v.id("conversations") },
  handler: async (ctx, { actor, conversationId }) => {
    const resolved = await resolveActor(ctx, actor);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.authorId !== resolved.employee?._id)
      return null;
    const employee = await ctx.db.get(conversation.employeeId);
    if (!employee) return null;
    const review = conversation.reviewId
      ? await ctx.db.get(conversation.reviewId)
      : null;
    const chosen = review?.sheet
      ? criteriaForSheet(review.sheet).filter(
          (c) =>
            c.kind === "mandatory" ||
            (review.additionalCriteria ?? []).includes(c.id),
        )
      : [];
    const observations = (
      await ctx.db
        .query("observations")
        .withIndex("by_employee_date", (q) => q.eq("employeeId", employee._id))
        .collect()
    )
      .filter((o) => canReadObservation(resolved, o))
      .filter((o) => !review?.periodStart || o.date >= review.periodStart)
      .slice(-30);
    const mandatory = review?.sheet
      ? RULES_2016.sheets[review.sheet].mandatory
      : [];
    return {
      authorId: conversation.authorId,
      employeeId: employee._id,
      reviewId: conversation.reviewId,
      kind: conversation.kind,
      position: employee.position,
      names: [
        `${employee.firstName} ${employee.lastName}`,
        employee.firstName,
        employee.lastName,
      ],
      criteria: chosen.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
      catalog: RULES_2016.catalog
        .filter((c) => !(mandatory as string[]).includes(c.id))
        .map((c) => ({ id: c.id, name: c.name })),
      observations: observations.map((o) => ({
        date: o.date,
        criterionId: o.criterionId,
        sentiment: o.sentiment,
        text: o.text,
      })),
    };
  },
});
