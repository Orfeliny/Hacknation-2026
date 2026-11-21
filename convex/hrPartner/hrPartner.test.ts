import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { DemoRole } from "../lib/validators";
import { addDays } from "../rules/dates";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const TODAY = "2026-11-21";
const ago = (days: number) => addDays(TODAY, -days);
const actor = (role: DemoRole) => ({ role });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});
afterEach(() => {
  vi.useRealTimers();
});

type Office = {
  boss: Id<"employees">;
  analyst: Id<"employees">;
  clerk: Id<"employees">;
  outsider: Id<"employees">;
  director: Id<"employees">;
};

async function office(t: ReturnType<typeof convexTest>): Promise<Office> {
  return await t.run(async (ctx) => {
    const base = { position: "Specjalista", unit: "Wydział", createdAt: 0 };
    const director = await ctx.db.insert("employees", {
      ...base,
      firstName: "Ewa",
      lastName: "Dyrektor",
      demoPersona: "director",
    });
    const boss = await ctx.db.insert("employees", {
      ...base,
      firstName: "Katarzyna",
      lastName: "Szef",
      supervisorId: director,
      demoPersona: "supervisor",
    });
    const analyst = await ctx.db.insert("employees", {
      ...base,
      firstName: "Joanna",
      lastName: "Mazur",
      supervisorId: boss,
    });
    const clerk = await ctx.db.insert("employees", {
      ...base,
      firstName: "Adam",
      lastName: "Kowal",
      supervisorId: boss,
      demoPersona: "employee",
    });
    const outsider = await ctx.db.insert("employees", {
      ...base,
      firstName: "Olga",
      lastName: "Obca",
      supervisorId: director,
    });
    await ctx.db.insert("employees", {
      ...base,
      firstName: "Hanna",
      lastName: "Kadrowa",
      demoPersona: "hr",
    });
    return { boss, analyst, clerk, outsider, director };
  });
}

async function note(
  t: ReturnType<typeof convexTest>,
  office: Office,
  employeeId: Id<"employees">,
  daysAgo: number,
  patch: { sentiment?: "positive" | "neutral"; wellbeing?: boolean } = {},
) {
  await t.run((ctx) =>
    ctx.db.insert("observations", {
      employeeId,
      authorId: office.boss,
      date: ago(daysAgo),
      text: "Tajna treść obserwacji, której model nie może zobaczyć.",
      sentiment: patch.sentiment ?? "neutral",
      wellbeing: patch.wellbeing,
      createdAt: 0,
    }),
  );
}

const overloaded = async (t: ReturnType<typeof convexTest>, o: Office) => {
  for (const days of [4, 15, 27])
    await note(t, o, o.analyst, days, { wellbeing: true });
};

describe("listForSupervisor", () => {
  it("shows the supervisor's reports with their signals, the most affected first", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await overloaded(t, o);
    const { today, team } = await t.query(
      api.hrPartner.queries.listForSupervisor,
      {
        actor: actor("supervisor"),
      },
    );
    expect(today).toBe(TODAY);
    expect(team.map((row) => row.employee.lastName)).toEqual([
      "Mazur",
      "Kowal",
    ]);
    expect(team[0]?.signals).toHaveLength(1);
    expect(team[0]?.signals[0]).toMatchObject({
      kind: "workload",
      signalId: null,
      recommendations: null,
    });
    expect(team[0]?.signals[0]?.reason).toContain("Co najmniej 3 obserwacje");
    expect(team[1]?.signals).toEqual([]);
  });

  it("hides archived employees", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await t.run((ctx) => ctx.db.patch(o.clerk, { archivedAt: 1 }));
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    expect(team.map((row) => row.employee.lastName)).toEqual(["Mazur"]);
  });

  it("does not show another supervisor's employees", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await note(t, o, o.outsider, 3, { wellbeing: true });
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    expect(team.map((row) => row.employee.id)).not.toContain(o.outsider);
  });

  it("shows a supervisor's own signals to their supervisor only", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await t.run((ctx) =>
      ctx.db.patch(o.boss, {
        staffingEvents: [{ kind: "duties_change", from: ago(20) }],
      }),
    );
    const mine = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    expect(mine.team.map((row) => row.employee.id)).not.toContain(o.boss);
    const theirs = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("director"),
    });
    const bossRow = theirs.team.find((row) => row.employee.id === o.boss);
    expect(bossRow?.signals.map((s) => s.kind)).toEqual(["duties_change"]);
  });

  it("refuses the employee role, HR and a role with no persona", async () => {
    const t = convexTest(schema, modules);
    await office(t);
    for (const role of ["employee", "hr"] as const) {
      await expect(
        t.query(api.hrPartner.queries.listForSupervisor, {
          actor: actor(role),
        }),
      ).rejects.toThrow(/przełożony/);
    }
    await expect(
      t.query(api.hrPartner.queries.listForSupervisor, {
        actor: actor("admin"),
      }),
    ).rejects.toThrow(/nie ma przypisanego/);
  });
});

describe("observations of a previous supervisor (D11)", () => {
  async function handedOverNotes(t: ReturnType<typeof convexTest>, o: Office) {
    const previous = await t.run((ctx) =>
      ctx.db.insert("employees", {
        position: "Naczelnik",
        unit: "Wydział",
        createdAt: 0,
        firstName: "Piotr",
        lastName: "Poprzedni",
      }),
    );
    const ids = await t.run(async (ctx) => {
      const rows: Id<"observations">[] = [];
      for (const days of [4, 15, 27]) {
        rows.push(
          await ctx.db.insert("observations", {
            employeeId: o.analyst,
            authorId: previous,
            date: ago(days),
            text: "Notatka poprzedniego przełożonego.",
            sentiment: "neutral",
            wellbeing: true,
            createdAt: 0,
          }),
        );
      }
      return rows;
    });
    return ids;
  }

  const analystSignals = async (t: ReturnType<typeof convexTest>) => {
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    return team.find((row) => row.employee.lastName === "Mazur")?.signals ?? [];
  };

  it("hides signals built from another author's observations until they are handed over", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    const ids = await handedOverNotes(t, o);
    expect(await analystSignals(t)).toEqual([]);
    await t.run(async (ctx) => {
      for (const id of ids) {
        await ctx.db.patch(id, {
          handover: { toEvaluatorId: o.boss, consentedAt: 1 },
        });
      }
    });
    expect((await analystSignals(t)).map((s) => s.kind)).toEqual(["workload"]);
  });

  it("keeps those observations out of the facts sent to the model", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await note(t, o, o.analyst, 2, { wellbeing: true });
    await handedOverNotes(t, o);
    const ask = await t.query(internal.hrPartner.queries.askContext, {
      actor: actor("supervisor"),
      employeeId: o.analyst,
    });
    expect(ask.focus?.facts.observations.wellbeingTagged).toBe(1);
  });

  it("still counts them for HR, who may read every observation", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await handedOverNotes(t, o);
    const summary = await t.query(api.hrPartner.queries.hrSummary, {
      actor: actor("hr"),
    });
    expect(summary.perKind).toEqual([
      { kind: "workload", signals: 1, employees: 1 },
    ]);
  });
});

describe("hrSummary", () => {
  it("gives HR counts per kind and nothing that identifies a person", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await overloaded(t, o);
    await note(t, o, o.clerk, 5, { sentiment: "positive" });
    const summary = await t.query(api.hrPartner.queries.hrSummary, {
      actor: actor("hr"),
    });
    expect(summary.employees).toBe(6);
    expect(summary.perKind).toEqual([
      { kind: "recognition_moment", signals: 1, employees: 1 },
      { kind: "workload", signals: 1, employees: 1 },
    ]);
    const text = JSON.stringify(summary);
    expect(text).not.toMatch(/Mazur|Joanna|Kowal|Tajna/);
  });

  it("is refused for every role except HR", async () => {
    const t = convexTest(schema, modules);
    await office(t);
    for (const role of [
      "supervisor",
      "employee",
      "director",
      "admin",
    ] as const) {
      await expect(
        t.query(api.hrPartner.queries.hrSummary, { actor: actor(role) }),
      ).rejects.toThrow(/kadr/);
    }
  });
});

describe("setStatus", () => {
  const first = async (t: ReturnType<typeof convexTest>) => {
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    return team[0];
  };

  it("hides a dismissed signal and brings it back when the evidence changes", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await overloaded(t, o);
    const row = await first(t);
    const signal = row.signals[0];
    await t.mutation(api.hrPartner.mutations.setStatus, {
      actor: actor("supervisor"),
      employeeId: o.analyst,
      kind: signal.kind,
      reason: signal.reason,
      status: "dismissed",
    });
    expect((await first(t)).signals).toEqual([]);
    await note(t, o, o.analyst, 1, { wellbeing: true });
    const again = (await first(t)).signals;
    expect(again).toHaveLength(1);
    expect(again[0]?.reason).toContain(ago(1));
  });

  it("clears a recognition moment once it is marked as acted on", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await note(t, o, o.clerk, 5, { sentiment: "positive" });
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    const kowal = team.find((r) => r.employee.id === o.clerk)!;
    expect(kowal.signals.map((s) => s.kind)).toEqual(["recognition_moment"]);
    await t.mutation(api.hrPartner.mutations.setStatus, {
      actor: actor("supervisor"),
      employeeId: o.clerk,
      kind: "recognition_moment",
      reason: kowal.signals[0].reason,
      status: "acted",
    });
    const after = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    expect(after.team.find((r) => r.employee.id === o.clerk)?.signals).toEqual(
      [],
    );
  });

  it("rejects a signal that is no longer current and a caller who is not the supervisor", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await expect(
      t.mutation(api.hrPartner.mutations.setStatus, {
        actor: actor("supervisor"),
        employeeId: o.analyst,
        kind: "workload",
        reason: "wymyślony powód",
        status: "dismissed",
      }),
    ).rejects.toThrow(/nieaktualny/);
    await expect(
      t.mutation(api.hrPartner.mutations.setStatus, {
        actor: actor("supervisor"),
        employeeId: o.outsider,
        kind: "workload",
        reason: "x",
        status: "dismissed",
      }),
    ).rejects.toThrow(/przełożony/);
    await expect(
      t.mutation(api.hrPartner.mutations.setStatus, {
        actor: actor("employee"),
        employeeId: o.analyst,
        kind: "workload",
        reason: "x",
        status: "dismissed",
      }),
    ).rejects.toThrow(/przełożony/);
  });
});

describe("saveRecommendations", () => {
  it("stores the actions on the signal and updates them in place", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await overloaded(t, o);
    const signal = (
      await t.query(api.hrPartner.queries.listForSupervisor, {
        actor: actor("supervisor"),
      })
    ).team[0].signals[0];
    const args = {
      supervisorId: o.boss,
      employeeId: o.analyst,
      kind: signal.kind,
      reason: signal.reason,
    };
    const first = await t.mutation(
      internal.hrPartner.mutations.saveRecommendations,
      {
        ...args,
        recommendations: [
          { text: "Odciąż jedno zadanie.", kind: "organizational" },
        ],
      },
    );
    const second = await t.mutation(
      internal.hrPartner.mutations.saveRecommendations,
      {
        ...args,
        recommendations: [
          { text: "Porozmawiaj o priorytetach.", kind: "conversation" },
        ],
      },
    );
    expect(second).toBe(first);
    const stored = (
      await t.query(api.hrPartner.queries.listForSupervisor, {
        actor: actor("supervisor"),
      })
    ).team[0].signals[0];
    expect(stored.signalId).toBe(first);
    expect(stored.recommendations).toEqual([
      { text: "Porozmawiaj o priorytetach.", kind: "conversation" },
    ]);
  });
});

describe("signalContext and askContext", () => {
  it("give the model counts and dates but never the text of an observation", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await overloaded(t, o);
    const signal = (
      await t.query(api.hrPartner.queries.listForSupervisor, {
        actor: actor("supervisor"),
      })
    ).team[0].signals[0];
    const context = await t.query(internal.hrPartner.queries.signalContext, {
      actor: actor("supervisor"),
      employeeId: o.analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    expect(context.facts.observations).toEqual({
      positive: 0,
      development: 0,
      neutral: 3,
      wellbeingTagged: 3,
    });
    expect(context.supervisorId).toBe(o.boss);
    expect(JSON.stringify(context)).not.toContain("Tajna treść");
    const ask = await t.query(internal.hrPartner.queries.askContext, {
      actor: actor("supervisor"),
      employeeId: o.analyst,
    });
    expect(ask.names).toContainEqual({
      firstName: "Joanna",
      lastName: "Mazur",
    });
    expect(ask.focus?.signals).toHaveLength(1);
    expect(JSON.stringify(ask)).not.toContain("Tajna treść");
  });

  it("refuses an employee who is not the caller's report", async () => {
    const t = convexTest(schema, modules);
    const o = await office(t);
    await expect(
      t.query(internal.hrPartner.queries.askContext, {
        actor: actor("supervisor"),
        employeeId: o.outsider,
      }),
    ).rejects.toThrow(/przełożony/);
    await expect(
      t.query(internal.hrPartner.queries.signalContext, {
        actor: actor("supervisor"),
        employeeId: o.analyst,
        kind: "workload",
        reason: "nieaktualny",
      }),
    ).rejects.toThrow(/nieaktualny/);
  });
});

describe("demo seed", () => {
  it("gives the demo supervisor an analyst with a workload signal and is idempotent", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.employees.seed.run, {});
    const first = await t.mutation(internal.hrPartner.seed.run, {});
    const second = await t.mutation(internal.hrPartner.seed.run, {});
    expect(first.inserted).toBe(4);
    expect(second.inserted).toBe(0);
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: actor("supervisor"),
    });
    const analyst = team.find((row) => row.employee.lastName === "Mazur");
    expect(analyst?.signals.map((s) => s.kind)).toContain("workload");
    const anna = team.find((row) => row.employee.lastName === "Przykładowa");
    expect(anna?.signals.map((s) => s.kind)).toContain("recognition_moment");
  });

  it("fails clearly without the demo office", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.hrPartner.seed.run, {})).rejects.toThrow(
      /employees\/seed:run/,
    );
  });
});
