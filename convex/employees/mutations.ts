import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { isoDate, positionKind } from "../lib/validators";
import { requireManager } from "./access";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function requireDate(value: string | undefined, label: string) {
  if (value !== undefined && !ISO.test(value)) {
    throw new Error(`${label}: oczekiwano daty RRRR-MM-DD.`);
  }
}

function requireText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} nie może być puste.`);
  return value.trim();
}

export const create = mutation({
  args: {
    actor: demoActor,
    firstName: v.string(),
    lastName: v.string(),
    position: v.string(),
    unit: v.string(),
    positionKind,
    corpsRole: v.union(v.literal("official"), v.literal("employee")),
    contractTerm: v.optional(
      v.union(v.literal("indefinite"), v.literal("fixed_term")),
    ),
    indefiniteEmploymentSince: v.optional(isoDate),
    supervisorId: v.optional(v.id("employees")),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { actor, ...data }) => {
    requireManager(await resolveActor(ctx, actor));
    requireDate(data.indefiniteEmploymentSince, "Data zatrudnienia");
    if (data.corpsRole === "employee" && !data.contractTerm) {
      throw new Error("Dla pracownika służby cywilnej podaj rodzaj umowy.");
    }
    if (data.supervisorId && !(await ctx.db.get(data.supervisorId))) {
      throw new Error("Nie znaleziono przełożonego.");
    }
    return await ctx.db.insert("employees", {
      ...data,
      firstName: requireText(data.firstName, "Imię"),
      lastName: requireText(data.lastName, "Nazwisko"),
      position: requireText(data.position, "Stanowisko"),
      unit: requireText(data.unit, "Komórka"),
      createdAt: Date.now(),
    });
  },
});

// Changing the supervisor is an evaluator change: § 9 ust. 3 keeps the criteria chosen before.
export const changeSupervisor = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    supervisorId: v.id("employees"),
    from: isoDate,
    note: v.optional(v.string()),
  },
  handler: async (ctx, { actor, employeeId, supervisorId, from, note }) => {
    requireManager(await resolveActor(ctx, actor));
    requireDate(from, "Data zmiany");
    if (employeeId === supervisorId)
      throw new Error("Pracownik nie może być swoim przełożonym.");
    const employee = await ctx.db.get(employeeId);
    if (!employee) throw new Error("Nie znaleziono pracownika.");
    if (!(await ctx.db.get(supervisorId)))
      throw new Error("Nie znaleziono przełożonego.");
    await ctx.db.patch(employeeId, {
      supervisorId,
      staffingEvents: [
        ...(employee.staffingEvents ?? []),
        {
          kind: "evaluator_change",
          from,
          previousEvaluatorId: employee.supervisorId,
          note,
        },
      ],
    });
  },
});

// Duties change (§ 9, art. 81 ust. 6) or a justified absence (art. 81 ust. 7), without its reason.
export const recordStaffingEvent = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    kind: v.union(v.literal("duties_change"), v.literal("long_absence")),
    from: isoDate,
    to: v.optional(isoDate),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { actor, employeeId, kind, from, to, note }) => {
    requireManager(await resolveActor(ctx, actor));
    requireDate(from, "Data od");
    requireDate(to, "Data do");
    if (to && to < from)
      throw new Error("Data końca jest wcześniejsza niż data początku.");
    const employee = await ctx.db.get(employeeId);
    if (!employee) throw new Error("Nie znaleziono pracownika.");
    await ctx.db.patch(employeeId, {
      staffingEvents: [
        ...(employee.staffingEvents ?? []),
        { kind, from, to, note },
      ],
    });
  },
});

export const setSubstitution = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    substituteId: v.id("employees"),
    from: isoDate,
    to: v.optional(isoDate),
  },
  handler: async (ctx, { actor, employeeId, substituteId, from, to }) => {
    requireManager(await resolveActor(ctx, actor));
    requireDate(from, "Data od");
    requireDate(to, "Data do");
    if (employeeId === substituteId)
      throw new Error("Pracownik nie może zastępować sam siebie.");
    await ctx.db.patch(employeeId, {
      substitution: { substituteId, from, to },
    });
  },
});

export const archive = mutation({
  args: { actor: demoActor, employeeId: v.id("employees") },
  handler: async (ctx, { actor, employeeId }) => {
    requireManager(await resolveActor(ctx, actor));
    await ctx.db.patch(employeeId, { archivedAt: Date.now() });
  },
});
