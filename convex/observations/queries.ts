import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { assertIsoDate } from "../lib/validators";
import { todayIso } from "../reviews/context";
import { criteriaForSheet } from "../rules/assessment";
import { daysBetween } from "../rules/dates";
import { earlyReviewOnEvaluatorChange } from "../rules/deadlines";
import { canReadObservation, forbidEmployee } from "./access";

const inRange = (date: string, from?: string, to?: string) =>
  (!from || date >= from) && (!to || date <= to);

// Timeline of one employee, newest first, filtered by criterion and date range.
export const timeline = query({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    criterionId: v.optional(v.string()),
  },
  handler: async (ctx, { actor, employeeId, from, to, criterionId }) => {
    const resolved = await resolveActor(ctx, actor);
    forbidEmployee(resolved);
    if (from) assertIsoDate(from, "from");
    if (to) assertIsoDate(to, "to");
    const rows = await ctx.db
      .query("observations")
      .withIndex("by_employee_date", (q) => q.eq("employeeId", employeeId))
      .order("desc")
      .collect();
    const visible = rows.filter(
      (o) =>
        canReadObservation(resolved, o) &&
        inRange(o.date, from, to) &&
        (!criterionId || o.criterionId === criterionId),
    );
    const names = new Map<Id<"employees">, string>();
    const nameOf = async (id: Id<"employees">) => {
      if (!names.has(id)) {
        const e = await ctx.db.get(id);
        names.set(id, e ? `${e.firstName} ${e.lastName}` : "Nieznana osoba");
      }
      return names.get(id)!;
    };
    return Promise.all(
      visible.map(async (o) => ({
        ...o,
        mine: o.authorId === resolved.employee?._id,
        authorName: await nameOf(o.authorId),
        sharedWithName: o.handover
          ? await nameOf(o.handover.toEvaluatorId)
          : null,
      })),
    );
  },
});

// Criteria of the open review with no observation since the period began ("brakuje danych o
// kryterium X").
export const coverage = query({
  args: { actor: demoActor, employeeId: v.id("employees") },
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    forbidEmployee(resolved);
    const employee = await ctx.db.get(employeeId);
    const me = resolved.employee?._id;
    if (resolved.role !== "hr" && (!me || employee?.supervisorId !== me)) {
      throw new Error(
        "Pokrycie kryteriów widzi przełożony pracownika albo kadry.",
      );
    }
    const review = (
      await ctx.db
        .query("reviews")
        .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
        .collect()
    ).find((r) => r.stage !== "closed");
    if (!review?.sheet) return null;
    const criteria = criteriaForSheet(review.sheet).filter(
      (c) =>
        c.kind === "mandatory" ||
        (review.additionalCriteria ?? []).includes(c.id),
    );
    const notes = (
      await ctx.db
        .query("observations")
        .withIndex("by_employee_date", (q) => q.eq("employeeId", employeeId))
        .collect()
    ).filter(
      (o) =>
        canReadObservation(resolved, o) && inRange(o.date, review.periodStart),
    );
    const counted = new Map<string, number>();
    for (const o of notes) {
      if (o.criterionId)
        counted.set(o.criterionId, (counted.get(o.criterionId) ?? 0) + 1);
    }
    return {
      reviewId: review._id,
      since: review.periodStart ?? null,
      until: review.periodEnd ?? null,
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        count: counted.get(c.id) ?? 0,
      })),
      missing: criteria.filter((c) => !counted.has(c.id)).map((c) => c.name),
    };
  },
});

// For AI modules (#14, #15, #16) running inside the backend; callers check access themselves.
export const listForReview = internalQuery({
  args: {
    employeeId: v.id("employees"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { employeeId, from, to },
  ): Promise<Doc<"observations">[]> => {
    const rows = await ctx.db
      .query("observations")
      .withIndex("by_employee_date", (q) => q.eq("employeeId", employeeId))
      .collect();
    return rows.filter((o) => inRange(o.date, from, to));
  },
});

// "Zmiana oceniającego": every employee the actor wrote observations about whose supervisor is
// now someone else (HR already reassigned them), with the data the consent screen needs. The
// observation ids come from the author's own entries only.
export const handoverPlan = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = resolved.employee?._id;
    if (resolved.role !== "supervisor" || !me) return [];
    const mine = await ctx.db
      .query("observations")
      .withIndex("by_author", (q) => q.eq("authorId", me))
      .collect();
    const byEmployee = new Map<Id<"employees">, typeof mine>();
    for (const o of mine) {
      byEmployee.set(o.employeeId, [
        ...(byEmployee.get(o.employeeId) ?? []),
        o,
      ]);
    }
    const today = todayIso();
    const plan = [];
    for (const [employeeId, entries] of byEmployee) {
      const employee = await ctx.db.get(employeeId);
      if (!employee || employee.archivedAt !== undefined) continue;
      const successorId = employee.supervisorId;
      if (!successorId || successorId === me) continue;
      const successor = await ctx.db.get(successorId);
      if (!successor) continue;
      const review = (
        await ctx.db
          .query("reviews")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect()
      ).find((r) => r.stage !== "closed");
      const change = [...(employee.staffingEvents ?? [])]
        .filter(
          (e) => e.kind === "evaluator_change" && e.previousEvaluatorId === me,
        )
        .sort((a, b) => b.from.localeCompare(a.from))[0];
      const firstEntry = entries.reduce(
        (min, o) => (o.date < min ? o.date : min),
        today,
      );
      const cycleStart = review?.periodStart ?? firstEntry;
      const supervisedSince = cycleStart > firstEntry ? cycleStart : firstEntry;
      plan.push({
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        position: employee.position,
        successorId,
        successorName: `${successor.firstName} ${successor.lastName}`,
        effectiveFrom: change?.from ?? null,
        reviewId: review?._id ?? null,
        dueDate: review?.dueDate ?? null,
        supervisedDays: daysBetween(supervisedSince, today),
        early: earlyReviewOnEvaluatorChange({
          cycleStart,
          supervisedSince,
          today,
        }),
        observationIds: entries.map((o) => o._id),
        handedOver: entries.filter((o) => o.handover !== undefined).length,
      });
    }
    return plan.sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName, "pl"),
    );
  },
});
