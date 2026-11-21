import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import { resolveActor } from "../lib/demoRole";
import schema from "../schema";
import { DEMO_EMPLOYEES } from "./seed";

const modules = import.meta.glob("/convex/**/*.*s");

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  return t;
}

const keyOf = (t: Awaited<ReturnType<typeof seeded>>, key: string) =>
  t.run(
    async (ctx) =>
      (await ctx.db
        .query("employees")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", key))
        .unique())!,
  );

describe("employees seed", () => {
  it("creates the demo office once and updates it in place on re-run", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.employees.seed.run, {})).toEqual({
      inserted: DEMO_EMPLOYEES.length,
      total: DEMO_EMPLOYEES.length,
    });
    expect(await t.mutation(internal.employees.seed.run, {})).toMatchObject({
      inserted: 0,
    });
    const count = await t.run(
      async (ctx) => (await ctx.db.query("employees").collect()).length,
    );
    expect(count).toBe(DEMO_EMPLOYEES.length);
  });

  it("seeds exactly one persona per demo role and covers sheets A, B and C", async () => {
    const t = await seeded();
    await t.run(async (ctx) => {
      for (const role of [
        "supervisor",
        "employee",
        "hr",
        "director",
        "admin",
      ] as const) {
        expect((await resolveActor(ctx, { role })).employee).not.toBeNull();
      }
      const kinds = new Set(
        (await ctx.db.query("employees").collect()).map((e) => e.positionKind),
      );
      expect(kinds).toEqual(
        new Set(["office_head", "managerial", "non_managerial"]),
      );
    });
  });

  it("links supervisors and the previous evaluator, and uses plain ASCII e-mails", async () => {
    const t = await seeded();
    const naczelnik = await keyOf(t, "naczelnik");
    const archiwista = await keyOf(t, "archiwista");
    const admin = await keyOf(t, "admin");
    expect(archiwista.supervisorId).toBe(naczelnik._id);
    expect(archiwista.staffingEvents?.[0]?.previousEvaluatorId).toBe(
      (await keyOf(t, "dyrektor-departamentu"))._id,
    );
    expect(admin.email).toBe("lukasz.pawlak@urzad.example");
  });
});

describe("team and card", () => {
  it("shows a supervisor only direct reports, alphabetically", async () => {
    const t = await seeded();
    const team = await t.query(api.employees.queries.team, {
      actor: { role: "supervisor" },
    });
    expect(team.map((e) => e.lastName)).toEqual([
      "Kaczmarek",
      "Krawczyk",
      "Lewandowski",
      "Mazur",
      "Przykładowa",
      "Wójcik",
    ]);
  });

  it("shows an employee only themselves and HR everyone", async () => {
    const t = await seeded();
    const mine = await t.query(api.employees.queries.team, {
      actor: { role: "employee" },
    });
    expect(mine.map((e) => e.seedKey)).toEqual(["anna"]);
    const all = await t.query(api.employees.queries.team, {
      actor: { role: "hr" },
    });
    expect(all).toHaveLength(DEMO_EMPLOYEES.length);
  });

  it("returns a card with supervisor and newest staffing events first, and hides others' cards", async () => {
    const t = await seeded();
    const radca = await keyOf(t, "radca");
    const card = await t.query(api.employees.queries.card, {
      actor: { role: "supervisor" },
      employeeId: radca._id,
    });
    expect(card?.supervisor?.seedKey).toBe("naczelnik");
    expect(card?.staffingEvents.map((e) => e.from)).toEqual([
      "2026-10-19",
      "2026-10-05",
    ]);
    expect(
      await t.query(api.employees.queries.card, {
        actor: { role: "employee" },
        employeeId: radca._id,
      }),
    ).toBeNull();
  });
});

describe("staffing changes", () => {
  it("lets HR change the supervisor and records an evaluator change", async () => {
    const t = await seeded();
    const radca = await keyOf(t, "radca");
    const dyrektor = await keyOf(t, "dyrektor-departamentu");
    await t.mutation(api.employees.mutations.changeSupervisor, {
      actor: { role: "hr" },
      employeeId: radca._id,
      supervisorId: dyrektor._id,
      from: "2026-12-01",
    });
    const after = await keyOf(t, "radca");
    expect(after.supervisorId).toBe(dyrektor._id);
    expect(after.staffingEvents?.at(-1)).toMatchObject({
      kind: "evaluator_change",
      from: "2026-12-01",
      previousEvaluatorId: radca.supervisorId,
    });
  });

  it("refuses staffing changes from a supervisor and bad dates", async () => {
    const t = await seeded();
    const radca = await keyOf(t, "radca");
    await expect(
      t.mutation(api.employees.mutations.recordStaffingEvent, {
        actor: { role: "supervisor" },
        employeeId: radca._id,
        kind: "long_absence",
        from: "2026-01-01",
      }),
    ).rejects.toThrow(/kadry/);
    await expect(
      t.mutation(api.employees.mutations.recordStaffingEvent, {
        actor: { role: "hr" },
        employeeId: radca._id,
        kind: "long_absence",
        from: "2026-02-10",
        to: "2026-02-01",
      }),
    ).rejects.toThrow(/wcześniejsza/);
  });

  it("creates an employee, requires a contract term for employees and archives", async () => {
    const t = await seeded();
    const base = {
      actor: { role: "hr" as const },
      firstName: " Jan ",
      lastName: "Nowy",
      position: "Referent",
      unit: "Wydział Kadr",
      positionKind: "non_managerial" as const,
      corpsRole: "employee" as const,
    };
    await expect(
      t.mutation(api.employees.mutations.create, base),
    ).rejects.toThrow(/rodzaj umowy/);
    const id = await t.mutation(api.employees.mutations.create, {
      ...base,
      contractTerm: "indefinite",
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.firstName).toBe("Jan");
    await t.mutation(api.employees.mutations.archive, {
      actor: { role: "admin" },
      employeeId: id,
    });
    const all = await t.query(api.employees.queries.team, {
      actor: { role: "hr" },
    });
    expect(all.find((e) => e._id === id)).toBeUndefined();
  });
});
