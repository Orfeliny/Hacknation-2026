import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  const key = (seedKey: string) =>
    t.run(
      async (ctx) =>
        (await ctx.db
          .query("employees")
          .withIndex("by_seedKey", (q) => q.eq("seedKey", seedKey))
          .unique())!._id,
    );
  return { t, key };
}

const note = (employeeId: string, extra: object = {}) => ({
  actor: { role: "supervisor" as const },
  employeeId: employeeId as never,
  date: "2026-05-12",
  text: "Zadanie w tydzień zamiast dwóch miesięcy.",
  sentiment: "positive" as const,
  ...extra,
});

describe("adding observations", () => {
  it("lets the supervisor add a note with three inputs and trims the text", async () => {
    const { t, key } = await seeded();
    const anna = await key("anna");
    await t.mutation(
      api.observations.mutations.add,
      note(anna, { text: "  Dobra analiza.  " }),
    );
    const rows = await t.query(api.observations.queries.timeline, {
      actor: { role: "supervisor" },
      employeeId: anna,
    });
    expect(rows.map((o) => o.text)).toEqual(["Dobra analiza."]);
  });

  it("rejects empty or too long text, a bad date, an unknown criterion and a non-supervisor", async () => {
    const { t, key } = await seeded();
    const anna = await key("anna");
    const add = (extra: object, role: "supervisor" | "hr" = "supervisor") =>
      t.mutation(api.observations.mutations.add, {
        ...note(anna, extra),
        actor: { role },
      });
    await expect(add({ text: "   " })).rejects.toThrow(/pusta/);
    await expect(add({ text: "x".repeat(1001) })).rejects.toThrow(/1000/);
    await expect(add({ date: "2026-02-30" })).rejects.toThrow(/calendar date/);
    await expect(add({ criterionId: "nieznane" })).rejects.toThrow(
      /Nieznane kryterium/,
    );
    await expect(add({}, "hr")).rejects.toThrow(/bezpośredni przełożony/);
  });
});

describe("who reads observations (D11)", () => {
  it("gives HR the content and the employee an error", async () => {
    const { t, key } = await seeded();
    const anna = await key("anna");
    await t.mutation(api.observations.mutations.add, note(anna));
    const hr = await t.query(api.observations.queries.timeline, {
      actor: { role: "hr" },
      employeeId: anna,
    });
    expect(hr).toHaveLength(1);
    await expect(
      t.query(api.observations.queries.timeline, {
        actor: { role: "employee" },
        employeeId: anna,
      }),
    ).rejects.toThrow(/nie są dostępne dla ocenianego/);
  });

  it("shows the next evaluator only what the author handed over", async () => {
    const { t, key } = await seeded();
    const anna = await key("anna");
    const successor = await key("dyrektor-departamentu");
    const handed = await t.mutation(api.observations.mutations.add, note(anna));
    await t.mutation(
      api.observations.mutations.add,
      note(anna, { date: "2026-06-01", text: "Prywatna notatka robocza." }),
    );
    await t.run((ctx) => ctx.db.patch(successor, { demoPersona: undefined }));
    await t.run(async (ctx) => {
      const director = (await ctx.db
        .query("employees")
        .withIndex("by_demoPersona", (q) => q.eq("demoPersona", "director"))
        .unique())!;
      await ctx.db.patch(director._id, { demoPersona: undefined });
      await ctx.db.patch(successor, { demoPersona: "director" });
    });
    const asSuccessor = () =>
      t.query(api.observations.queries.timeline, {
        actor: { role: "director" },
        employeeId: anna,
      });
    expect(await asSuccessor()).toEqual([]);

    await t.mutation(api.observations.mutations.handOver, {
      actor: { role: "supervisor" },
      observationIds: [handed],
      toEvaluatorId: successor,
    });
    expect((await asSuccessor()).map((o) => o.date)).toEqual(["2026-05-12"]);

    await t.mutation(api.observations.mutations.revokeHandover, {
      actor: { role: "supervisor" },
      observationId: handed,
    });
    expect(await asSuccessor()).toEqual([]);
  });

  it("lets only the author change, delete or hand over a note", async () => {
    const { t, key } = await seeded();
    const anna = await key("anna");
    const id = await t.mutation(api.observations.mutations.add, note(anna));
    await expect(
      t.mutation(api.observations.mutations.update, {
        actor: { role: "hr" },
        observationId: id,
        text: "x",
      }),
    ).rejects.toThrow(/własne/);
    await t.mutation(api.observations.mutations.update, {
      actor: { role: "supervisor" },
      observationId: id,
      sentiment: "neutral",
    });
    await t.mutation(api.observations.mutations.remove, {
      actor: { role: "supervisor" },
      observationId: id,
    });
    expect(
      await t.query(api.observations.queries.timeline, {
        actor: { role: "hr" },
        employeeId: anna,
      }),
    ).toEqual([]);
  });
});

describe("timeline, coverage and AI access", () => {
  it("filters by criterion and date range, newest first", async () => {
    const { t, key } = await seeded();
    await t.mutation(internal.observations.seed.run, {});
    const anna = await key("anna");
    const all = await t.query(api.observations.queries.timeline, {
      actor: { role: "supervisor" },
      employeeId: anna,
    });
    expect(all.map((o) => o.date)).toEqual([
      "2026-09-18",
      "2026-02-03",
      "2025-06-12",
    ]);
    const ranged = await t.query(api.observations.queries.timeline, {
      actor: { role: "supervisor" },
      employeeId: anna,
      from: "2026-01-01",
      criterionId: "komunikacja",
    });
    expect(ranged.map((o) => o.date)).toEqual(["2026-02-03"]);
  });

  it("lists the review's criteria with no observation in the period", async () => {
    const { t, key } = await seeded();
    await t.mutation(internal.observations.seed.run, {});
    const anna = await key("anna");
    const boss = await key("naczelnik");
    await t.run((ctx) =>
      ctx.db.insert("reviews", {
        employeeId: anna,
        evaluatorId: boss,
        stage: "observation",
        sheet: "C",
        periodStart: "2025-01-01",
        additionalCriteria: ["myslenie_analityczne"],
        createdAt: 0,
      }),
    );
    const result = await t.query(api.observations.queries.coverage, {
      actor: { role: "supervisor" },
      employeeId: anna,
    });
    expect([...(result?.missing ?? [])].sort()).toEqual([
      "Myślenie analityczne",
      "Rzetelność",
      "Współpraca",
    ]);
    expect(result?.criteria.find((c) => c.id === "komunikacja")?.count).toBe(1);
  });

  it("gives AI modules the observations of a period", async () => {
    const { t, key } = await seeded();
    await t.mutation(internal.observations.seed.run, {});
    expect(await t.mutation(internal.observations.seed.run, {})).toEqual({
      inserted: 0,
    });
    const radca = await key("radca");
    const rows = await t.query(internal.observations.queries.listForReview, {
      employeeId: radca,
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(rows.map((o) => o.date)).toEqual(["2026-04-22"]);
  });
});
