import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { addDays } from "../rules/dates";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const TODAY = "2026-11-21";
const supervisor = { role: "supervisor" } as const;
const employee = { role: "employee" } as const;
const hr = { role: "hr" } as const;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  vi.stubEnv("AI_PROVIDER", "");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const base = { position: "Główny analityk", unit: "Wydział", createdAt: 0 };
    const boss = await ctx.db.insert("employees", {
      ...base,
      firstName: "Katarzyna",
      lastName: "Szef",
      demoPersona: "supervisor",
    });
    const analyst = await ctx.db.insert("employees", {
      ...base,
      firstName: "Joanna",
      lastName: "Mazur",
      supervisorId: boss,
      demoPersona: "employee",
    });
    const hrPerson = await ctx.db.insert("employees", {
      ...base,
      firstName: "Halina",
      lastName: "Kadrowa",
      demoPersona: "hr",
    });
    const observation = await ctx.db.insert("observations", {
      employeeId: analyst,
      authorId: boss,
      date: addDays(TODAY, -4),
      text: "Joanna Mazur zostaje po godzinach.",
      sentiment: "neutral",
      wellbeing: true,
      createdAt: 0,
    });
    for (const days of [15, 27]) {
      await ctx.db.insert("observations", {
        employeeId: analyst,
        authorId: boss,
        date: addDays(TODAY, -days),
        text: "Zostaje po godzinach.",
        sentiment: "neutral",
        wellbeing: true,
        createdAt: 0,
      });
    }
    const reviewId = await ctx.db.insert("reviews", {
      employeeId: analyst,
      evaluatorId: boss,
      stage: "opening",
      createdAt: 0,
    });
    return { boss, analyst, hrPerson, observation, reviewId };
  });
  return { t, ...ids };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const history = (t: T, reviewId: Id<"reviews">) =>
  t.query(api.audit.queries.accessHistory, { actor: hr, reviewId });

describe("view and export", () => {
  it("records who opened an assessment, with role and time", async () => {
    const { t, reviewId } = await setup();
    await t.mutation(api.audit.mutations.recordView, {
      actor: employee,
      reviewId,
    });
    await t.mutation(api.audit.mutations.recordView, {
      actor: supervisor,
      reviewId,
    });
    const rows = await history(t, reviewId);
    expect(rows.map((r) => [r.action, r.actorRole]).sort()).toEqual([
      ["view", "employee"],
      ["view", "supervisor"],
    ]);
    const own = rows.find((r) => r.actorRole === "employee");
    expect(own?.at).toBe(new Date(`${TODAY}T12:00:00Z`).getTime());
    expect(own?.actorName).toBe("Joanna Mazur");
  });

  it("does not record, and refuses, a view without access", async () => {
    const { t, reviewId } = await setup();
    await t.run(async (ctx) => {
      const review = await ctx.db.get(reviewId);
      const stranger = await ctx.db.insert("employees", {
        firstName: "Ewa",
        lastName: "Inna",
        position: "x",
        unit: "y",
        createdAt: 0,
      });
      await ctx.db.patch(review!.employeeId, { demoPersona: undefined });
      await ctx.db.patch(stranger, { demoPersona: "employee" });
    });
    await expect(
      t.mutation(api.audit.mutations.recordView, { actor: employee, reviewId }),
    ).rejects.toThrow("Nie masz dostępu");
    expect(await history(t, reviewId)).toHaveLength(0);
  });

  it("logs an HR read of a supervisor's observation, and refuses the employee", async () => {
    const { t, observation } = await setup();
    await t.mutation(api.audit.mutations.recordView, {
      actor: hr,
      observationId: observation,
    });
    const rows = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(rows).toMatchObject([
      { action: "view", entity: "observation", actorRole: "hr" },
    ]);
    await expect(
      t.mutation(api.audit.mutations.recordView, {
        actor: employee,
        observationId: observation,
      }),
    ).rejects.toThrow("Nie masz dostępu");
  });

  it("requires exactly one target", async () => {
    const { t, reviewId, observation } = await setup();
    await expect(
      t.mutation(api.audit.mutations.recordView, { actor: hr }),
    ).rejects.toThrow("Podaj");
    await expect(
      t.mutation(api.audit.mutations.recordView, {
        actor: hr,
        reviewId,
        observationId: observation,
      }),
    ).rejects.toThrow("Podaj");
  });

  it("records an export", async () => {
    const { t, reviewId } = await setup();
    await t.mutation(api.audit.mutations.recordExport, {
      actor: supervisor,
      reviewId,
    });
    expect((await history(t, reviewId)).map((r) => r.action)).toEqual([
      "export",
    ]);
  });
});

describe("access history", () => {
  it("is for HR only", async () => {
    const { t, reviewId } = await setup();
    for (const actor of [employee, supervisor]) {
      await expect(
        t.query(api.audit.queries.accessHistory, { actor, reviewId }),
      ).rejects.toThrow("tylko dla kadr");
    }
  });
});

describe("changes are logged by the existing mutations", () => {
  it("logs create, update and stage change of a review", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.employees.seed.run, {});
    const candidates = await t.query(api.reviews.queries.candidates, {
      actor: supervisor,
    });
    const reviewId = await t.mutation(api.reviews.mutations.start, {
      actor: supervisor,
      employeeId: candidates[0]._id,
    });
    await t.mutation(api.reviews.mutations.save, {
      actor: supervisor,
      reviewId,
      patch: { openingConversationDate: "2026-01-12" },
    });
    const rows = await history(t, reviewId);
    expect(rows.map((r) => r.action).sort()).toEqual(["create", "update"]);
    expect(rows.find((r) => r.action === "update")?.details).toBe(
      "openingConversationDate",
    );
  });

  it("logs observation create, update and removal without their text", async () => {
    const { t, analyst } = await setup();
    const id = await t.mutation(api.observations.mutations.add, {
      actor: supervisor,
      employeeId: analyst,
      date: TODAY,
      text: "Sekretna treść obserwacji",
      sentiment: "positive",
    });
    await t.mutation(api.observations.mutations.update, {
      actor: supervisor,
      observationId: id,
      text: "Inna sekretna treść",
    });
    await t.mutation(api.observations.mutations.remove, {
      actor: supervisor,
      observationId: id,
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entity", "observation").eq("entityId", id),
        )
        .collect(),
    );
    expect(rows.map((r) => r.action)).toEqual(["create", "update", "update"]);
    expect(JSON.stringify(rows)).not.toContain("sekretn");
  });
});

describe("AI register", () => {
  async function ask() {
    const ctx = await setup();
    const signal = (
      await ctx.t.query(api.hrPartner.queries.listForSupervisor, {
        actor: supervisor,
      })
    ).team
      .at(0)
      ?.signals.at(0);
    if (!signal) throw new Error("The setup produced no signal");
    const result = await ctx.t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: ctx.analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    if (!result.ok) throw new Error("The AI call failed");
    return { ...ctx, result };
  }

  it("registers every AI call without a name in the stored prompt", async () => {
    const { t, result } = await ask();
    const rows = await t.run((ctx) => ctx.db.query("aiInteractions").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?._id).toBe(result.interactionId);
    expect(rows[0]).toMatchObject({
      module: "hrPartner.recommend",
      provider: "mock",
      decision: "pending",
    });
    expect(rows[0]?.sentPrompt).toContain("[PRACOWNIK]");
    expect(`${rows[0]?.sentPrompt}${rows[0]?.output}`).not.toMatch(
      /Joanna|Mazur/,
    );
  });

  it("registers a question to the HR partner too", async () => {
    const { t, analyst } = await setup();
    const result = await t.action(api.hrPartner.actions.ask, {
      actor: supervisor,
      employeeId: analyst,
      question: "Jak porozmawiać z Joanna Mazur o obciążeniu?",
    });
    if (!result.ok) throw new Error("The AI call failed");
    const row = await t.run((ctx) => ctx.db.get(result.interactionId));
    expect(row?.module).toBe("hrPartner.ask");
    expect(row?.sentPrompt).not.toMatch(/Joanna|Mazur/);
  });

  it("replaces a name the caller forgot to pseudonymise", async () => {
    const { t, boss, analyst } = await setup();
    const id = await t.mutation(internal.audit.mutations.recordAiInteraction, {
      module: "test",
      provider: "mock",
      model: "mock",
      sentPrompt: "Czy Joanna Mazur radzi sobie z zespołem?",
      output: "Rozmawiaj z Joanną.",
      actorId: boss,
      employeeId: analyst,
    });
    const row = await t.run((ctx) => ctx.db.get(id));
    expect(`${row?.sentPrompt}${row?.output}`).not.toMatch(/Joann|Mazur/);
  });

  it("shows HR every entry and everyone else only their own", async () => {
    const { t, analyst, result } = await ask();
    await t.mutation(internal.audit.mutations.recordAiInteraction, {
      module: "other",
      provider: "mock",
      model: "mock",
      sentPrompt: "p",
      output: "o",
      actorId: analyst,
    });
    const seen = async (actor: typeof hr | typeof supervisor) =>
      (await t.query(api.audit.queries.aiRegister, { actor })).map(
        (r) => r.module,
      );
    expect((await seen(hr)).sort()).toEqual(["hrPartner.recommend", "other"]);
    expect(await seen(supervisor)).toEqual(["hrPartner.recommend"]);
    expect(
      await t.query(api.audit.queries.aiRegister, { actor: employee }),
    ).toHaveLength(1);
    await expect(
      t.query(api.audit.queries.aiInteraction, {
        actor: employee,
        interactionId: result.interactionId,
      }),
    ).rejects.toThrow("Nie masz dostępu");
    const mine = await t.query(api.audit.queries.aiInteraction, {
      actor: supervisor,
      interactionId: result.interactionId,
    });
    expect(mine.actorName).toBe("Katarzyna Szef");
  });

  it("lets only the caller record the human decision", async () => {
    const { t, result } = await ask();
    await expect(
      t.mutation(api.audit.mutations.decideAi, {
        actor: employee,
        interactionId: result.interactionId,
        decision: "accepted",
      }),
    ).rejects.toThrow("Decyzję podejmuje");
    await t.mutation(api.audit.mutations.decideAi, {
      actor: supervisor,
      interactionId: result.interactionId,
      decision: "edited",
    });
    const row = await t.run((ctx) => ctx.db.get(result.interactionId));
    expect(row?.decision).toBe("edited");
    expect(row?.decidedAt).toBeDefined();
  });
});
