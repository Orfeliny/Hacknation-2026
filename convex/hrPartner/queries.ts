import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { addDays } from "../rules/dates";
import { isSupervisorOf, requireHr, requireSupervisor } from "./access";
import { signalKind } from "./kinds";
import type { SignalKind } from "./rules";
import { signalsFor } from "./signals";
import { todayIso } from "./time";

const FACTS_WINDOW_DAYS = 90;

function byName(a: Doc<"employees">, b: Doc<"employees">) {
  return `${a.lastName} ${a.firstName}`.localeCompare(
    `${b.lastName} ${b.firstName}`,
    "pl",
  );
}

// Direct reports of the supervisor with their open signals, the most affected first.
export const listForSupervisor = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = requireSupervisor(resolved);
    const today = todayIso(Date.now());
    const team = (
      await ctx.db
        .query("employees")
        .withIndex("by_supervisor", (q) => q.eq("supervisorId", me._id))
        .collect()
    )
      .filter((employee) => employee.archivedAt === undefined)
      .sort(byName);
    const rows = await Promise.all(
      team.map(async (employee) => ({
        employee: {
          id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          position: employee.position,
          unit: employee.unit,
        },
        signals: await signalsFor(ctx, employee, today),
      })),
    );
    rows.sort((a, b) => b.signals.length - a.signals.length);
    return { today, team: rows };
  },
});

// HR sees how many signals of each kind exist, never who they concern or why.
export const hrSummary = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    requireHr(resolved);
    const today = todayIso(Date.now());
    const employees = (await ctx.db.query("employees").collect()).filter(
      (employee) => employee.archivedAt === undefined,
    );
    const perKind = new Map<
      SignalKind,
      { signals: number; employees: number }
    >();
    for (const employee of employees) {
      const seen = new Set<SignalKind>();
      for (const signal of await signalsFor(ctx, employee, today)) {
        const entry = perKind.get(signal.kind) ?? { signals: 0, employees: 0 };
        entry.signals += 1;
        if (!seen.has(signal.kind)) entry.employees += 1;
        seen.add(signal.kind);
        perKind.set(signal.kind, entry);
      }
    }
    return {
      today,
      employees: employees.length,
      perKind: [...perKind.entries()]
        .map(([kind, counts]) => ({ kind, ...counts }))
        .sort((a, b) => a.kind.localeCompare(b.kind)),
    };
  },
});

// Structured facts for the model: counts and dates, never the free text of an observation.
async function factsFor(
  ctx: Parameters<typeof signalsFor>[0],
  employee: Doc<"employees">,
  today: string,
) {
  const since = addDays(today, -FACTS_WINDOW_DAYS);
  const observations = (
    await ctx.db
      .query("observations")
      .withIndex("by_employee_date", (q) => q.eq("employeeId", employee._id))
      .collect()
  ).filter((o) => o.date >= since);
  return {
    windowDays: FACTS_WINDOW_DAYS,
    observations: {
      positive: observations.filter((o) => o.sentiment === "positive").length,
      development: observations.filter((o) => o.sentiment === "development")
        .length,
      neutral: observations.filter((o) => o.sentiment === "neutral").length,
      wellbeingTagged: observations.filter((o) => o.wellbeing === true).length,
    },
    staffing: (employee.staffingEvents ?? []).map((event) => ({
      kind: event.kind,
      from: event.from,
      to: event.to ?? null,
    })),
  };
}

// For the AI actions: authorises the caller and returns what the model may see.
export const signalContext = internalQuery({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    kind: signalKind,
    reason: v.string(),
  },
  handler: async (ctx, { actor, employeeId, kind, reason }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = requireSupervisor(resolved);
    const employee = await ctx.db.get(employeeId);
    if (!employee || !isSupervisorOf(resolved, employee)) {
      throw new Error("Sygnały widzi przełożony pracownika.");
    }
    const today = todayIso(Date.now());
    const signal = (await signalsFor(ctx, employee, today)).find(
      (s) => s.kind === kind && s.reason === reason,
    );
    if (!signal) throw new Error("Sygnał jest już nieaktualny.");
    return {
      supervisorId: me._id,
      today,
      employee: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
      },
      signal: { kind, reason, evidenceDate: signal.evidenceDate },
      facts: await factsFor(ctx, employee, today),
    };
  },
});

// For "ask the HR partner": the team's names (to pseudonymise) and, when one employee is chosen,
// their current signals and facts.
export const askContext = internalQuery({
  args: { actor: demoActor, employeeId: v.optional(v.id("employees")) },
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = requireSupervisor(resolved);
    const today = todayIso(Date.now());
    const team = (
      await ctx.db
        .query("employees")
        .withIndex("by_supervisor", (q) => q.eq("supervisorId", me._id))
        .collect()
    ).filter((employee) => employee.archivedAt === undefined);
    const names = [me, ...team].map((employee) => ({
      firstName: employee.firstName,
      lastName: employee.lastName,
    }));
    if (!employeeId) return { today, names, focus: null };
    const employee = team.find((member) => member._id === employeeId);
    if (!employee) throw new Error("Sygnały widzi przełożony pracownika.");
    const signals = await signalsFor(ctx, employee, today);
    return {
      today,
      names,
      focus: {
        employee: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          position: employee.position,
        },
        signals: signals.map(({ kind, reason }) => ({ kind, reason })),
        facts: await factsFor(ctx, employee, today),
      },
    };
  },
});
