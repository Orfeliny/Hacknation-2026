import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { DemoRole } from "../lib/validators";
import schema from "../schema";
import { MAX_OBSERVATIONS } from "./queries";

const modules = import.meta.glob("/convex/**/*.*s");

const actor = (role: DemoRole) => ({ role });

type World = {
  boss: Id<"employees">;
  employee: Id<"employees">;
  other: Id<"employees">;
  review: Id<"reviews">;
};

async function world(t: ReturnType<typeof convexTest>): Promise<World> {
  return await t.run(async (ctx) => {
    const base = { position: "Specjalista", unit: "Wydział", createdAt: 0 };
    const boss = await ctx.db.insert("employees", {
      ...base,
      firstName: "Katarzyna",
      lastName: "Szef",
      demoPersona: "supervisor",
    });
    const employee = await ctx.db.insert("employees", {
      ...base,
      firstName: "Joanna",
      lastName: "Mazur",
      supervisorId: boss,
      demoPersona: "employee",
    });
    const other = await ctx.db.insert("employees", {
      ...base,
      firstName: "Olga",
      lastName: "Obca",
    });
    await ctx.db.insert("employees", {
      ...base,
      firstName: "Hanna",
      lastName: "Kadrowa",
      demoPersona: "hr",
    });
    await ctx.db.insert("employees", {
      ...base,
      firstName: "Ewa",
      lastName: "Dyrektor",
      demoPersona: "director",
    });
    const review = await ctx.db.insert("reviews", {
      employeeId: employee,
      evaluatorId: boss,
      stage: "writing",
      createdAt: 1,
      sheet: "C",
      periodStart: "2025-01-01",
      ratings: [
        { criterionId: "komunikacja", levelId: "7" },
        { criterionId: "rzetelnosc", levelId: "5" },
      ],
    });
    return { boss, employee, other, review };
  });
}

const observe = (
  t: ReturnType<typeof convexTest>,
  w: World,
  patch: Partial<{
    date: string;
    sentiment: "positive" | "development" | "neutral";
    criterionId: string;
    authorId: Id<"employees">;
    text: string;
  }> = {},
) =>
  t.run((ctx) =>
    ctx.db.insert("observations", {
      employeeId: w.employee,
      authorId: patch.authorId ?? w.boss,
      date: patch.date ?? "2026-05-01",
      text: patch.text ?? "Obserwacja",
      sentiment: patch.sentiment ?? "positive",
      criterionId: patch.criterionId,
      createdAt: 0,
    }),
  );

describe("listForReview", () => {
  it("shows the evaluator the ratings with names and labels, the drafts and the cited observations", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const obs = await observe(t, w, {
      criterionId: "komunikacja",
      text: "Jasno wyjaśnił zalecenia.",
    });
    await t.run((ctx) =>
      ctx.db.insert("drafts", {
        reviewId: w.review,
        section: "criterion_justification",
        text: "Szkic",
        status: "proposed",
        createdAt: 1,
        criterionId: "komunikacja",
        observationIds: [obs],
      }),
    );
    const view = await t.query(api.drafting.queries.listForReview, {
      actor: actor("supervisor"),
      reviewId: w.review,
    });
    expect(view.review).toMatchObject({
      stage: "writing",
      sheet: "C",
      employeeName: "Joanna Mazur",
    });
    expect(view.ratings).toEqual([
      {
        criterionId: "komunikacja",
        name: "Komunikacja",
        points: 7,
        label: "powyżej oczekiwań",
      },
      {
        criterionId: "rzetelnosc",
        name: "Rzetelność",
        points: 5,
        label: "na poziomie oczekiwań",
      },
    ]);
    expect(view.drafts).toHaveLength(1);
    expect(view.evidence).toEqual([
      {
        id: obs,
        date: "2026-05-01",
        sentiment: "positive",
        criterionId: "komunikacja",
        text: "Jasno wyjaśnił zalecenia.",
      },
    ]);
  });

  it("refuses everyone who is not the evaluator of the review", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    for (const role of ["employee", "hr", "director", "admin"] as const) {
      await expect(
        t.query(api.drafting.queries.listForReview, {
          actor: actor(role),
          reviewId: w.review,
        }),
      ).rejects.toThrow(/tylko oceniający/);
    }
    await t.run(async (ctx) => {
      await ctx.db.patch(w.boss, { demoPersona: undefined });
      await ctx.db.patch(w.other, { demoPersona: "supervisor" });
    });
    await expect(
      t.query(api.drafting.queries.listForReview, {
        actor: actor("supervisor"),
        reviewId: w.review,
      }),
    ).rejects.toThrow(/tylko oceniający/);
  });

  it("does not show a cited observation the evaluator may not read", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const foreign = await observe(t, w, { authorId: w.other });
    await t.run((ctx) =>
      ctx.db.insert("drafts", {
        reviewId: w.review,
        section: "strength",
        text: "Szkic",
        status: "proposed",
        createdAt: 1,
        observationIds: [foreign],
      }),
    );
    const view = await t.query(api.drafting.queries.listForReview, {
      actor: actor("supervisor"),
      reviewId: w.review,
    });
    expect(view.evidence).toEqual([]);
  });
});

describe("draftContext", () => {
  const context = (
    t: ReturnType<typeof convexTest>,
    w: World,
    role: DemoRole = "supervisor",
  ) =>
    t.query(internal.drafting.queries.draftContext, {
      actor: actor(role),
      reviewId: w.review,
    });

  it("refuses a review with no ratings", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    await t.run((ctx) => ctx.db.patch(w.review, { ratings: [] }));
    await expect(context(t, w)).rejects.toThrow(/Najpierw wybierz oceny/);
  });

  it("labels the readable observations O1, O2, ... newest first and cuts long text", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    await observe(t, w, { date: "2026-03-01", text: "starsza" });
    await observe(t, w, { date: "2026-06-01", text: "x".repeat(500) });
    const result = await context(t, w);
    expect(result.observations.map((o) => [o.label, o.date])).toEqual([
      ["O1", "2026-06-01"],
      ["O2", "2026-03-01"],
    ]);
    expect(result.observations[0]?.text).toHaveLength(400);
    expect(result.ratings.map((r) => r.points)).toEqual([7, 5]);
  });

  it("leaves out observations of another author, those before the period and any beyond the cap (D11)", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    await observe(t, w, { authorId: w.other, text: "cudza" });
    await observe(t, w, { date: "2024-12-31", text: "sprzed okresu" });
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_OBSERVATIONS + 5; i++) {
        await ctx.db.insert("observations", {
          employeeId: w.employee,
          authorId: w.boss,
          date: "2026-02-01",
          text: `n${i}`,
          sentiment: "neutral",
          createdAt: 0,
        });
      }
    });
    const result = await context(t, w);
    expect(result.observations).toHaveLength(MAX_OBSERVATIONS);
    expect(result.observations.map((o) => o.text)).not.toContain("cudza");
    expect(result.observations.map((o) => o.text)).not.toContain(
      "sprzed okresu",
    );
  });

  it("includes an observation handed over to the evaluator", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const foreign = await observe(t, w, {
      authorId: w.other,
      text: "przekazana",
    });
    await t.run((ctx) =>
      ctx.db.patch(foreign, {
        handover: { toEvaluatorId: w.boss, consentedAt: 1 },
      }),
    );
    expect((await context(t, w)).observations.map((o) => o.text)).toEqual([
      "przekazana",
    ]);
  });

  it("refuses anyone else", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    await expect(context(t, w, "employee")).rejects.toThrow(/tylko oceniający/);
  });
});

describe("decisions on a fragment", () => {
  async function draft(t: ReturnType<typeof convexTest>, w: World) {
    return await t.run((ctx) =>
      ctx.db.insert("drafts", {
        reviewId: w.review,
        section: "strength",
        text: "Szkic",
        status: "proposed",
        createdAt: 1,
      }),
    );
  }
  const status = async (t: ReturnType<typeof convexTest>, id: Id<"drafts">) => {
    const row = (await t.run((ctx) => ctx.db.get(id))) as Doc<"drafts"> | null;
    return row?.status;
  };

  it("accepts and rejects a fragment", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const id = await draft(t, w);
    await t.mutation(api.drafting.mutations.setStatus, {
      actor: actor("supervisor"),
      draftId: id,
      status: "accepted",
    });
    expect(await status(t, id)).toBe("accepted");
    await t.mutation(api.drafting.mutations.setStatus, {
      actor: actor("supervisor"),
      draftId: id,
      status: "rejected",
    });
    expect(await status(t, id)).toBe("rejected");
  });

  it("edits the text, trims it and marks the fragment as edited", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const id = await draft(t, w);
    await t.mutation(api.drafting.mutations.edit, {
      actor: actor("supervisor"),
      draftId: id,
      text: "  Nowy tekst  ",
    });
    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row).toMatchObject({ text: "Nowy tekst", status: "edited" });
  });

  it("refuses an empty text and one that is too long", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const id = await draft(t, w);
    for (const text of ["   ", "a".repeat(2001)]) {
      await expect(
        t.mutation(api.drafting.mutations.edit, {
          actor: actor("supervisor"),
          draftId: id,
          text,
        }),
      ).rejects.toThrow(/od 1 do 2000/);
    }
    await t.mutation(api.drafting.mutations.edit, {
      actor: actor("supervisor"),
      draftId: id,
      text: "a".repeat(2000),
    });
  });

  it("adds a fragment by hand as accepted", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const id = await t.mutation(api.drafting.mutations.addManual, {
      actor: actor("supervisor"),
      reviewId: w.review,
      section: "criterion_justification",
      criterionId: "komunikacja",
      text: " Własne uzasadnienie ",
    });
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      text: "Własne uzasadnienie",
      status: "accepted",
      criterionId: "komunikacja",
    });
  });

  it("refuses the employee, HR and a stranger on every change", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const id = await draft(t, w);
    for (const role of ["employee", "hr", "director"] as const) {
      await expect(
        t.mutation(api.drafting.mutations.setStatus, {
          actor: actor(role),
          draftId: id,
          status: "accepted",
        }),
      ).rejects.toThrow(/tylko oceniający/);
      await expect(
        t.mutation(api.drafting.mutations.edit, {
          actor: actor(role),
          draftId: id,
          text: "x",
        }),
      ).rejects.toThrow(/tylko oceniający/);
      await expect(
        t.mutation(api.drafting.mutations.addManual, {
          actor: actor(role),
          reviewId: w.review,
          section: "strength",
          text: "x",
        }),
      ).rejects.toThrow(/tylko oceniający/);
    }
  });
});

describe("replaceProposed", () => {
  const fragment = (patch: Record<string, unknown>) => ({
    section: "strength" as const,
    text: "Nowy",
    observationIds: [],
    noEvidence: true,
    ...patch,
  });

  it("replaces the proposed fragments and keeps what the evaluator decided", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const rows = await t.run(async (ctx) => {
      const make = (status: "proposed" | "accepted" | "edited" | "rejected") =>
        ctx.db.insert("drafts", {
          reviewId: w.review,
          section: "strength",
          text: status,
          status,
          createdAt: 1,
        });
      return {
        proposed: await make("proposed"),
        accepted: await make("accepted"),
        edited: await make("edited"),
        rejected: await make("rejected"),
      };
    });
    const result = await t.mutation(
      internal.drafting.mutations.replaceProposed,
      {
        reviewId: w.review,
        fragments: [fragment({ text: "Świeży" })],
      },
    );
    expect(result).toEqual({ inserted: 1, droppedActions: 0 });
    const left = await t.run(async (ctx) =>
      (await ctx.db.query("drafts").collect())
        .map((d) => `${d.status}:${d.text}`)
        .sort(),
    );
    expect(left).toEqual([
      "accepted:accepted",
      "edited:edited",
      "proposed:Świeży",
      "rejected:rejected",
    ]);
    expect(await t.run((ctx) => ctx.db.get(rows.proposed))).toBeNull();
  });

  it("links an action to its area and drops an action whose area is missing", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const result = await t.mutation(
      internal.drafting.mutations.replaceProposed,
      {
        reviewId: w.review,
        fragments: [
          fragment({
            section: "development_action",
            text: "Szkolenie",
            areaKey: "a1",
          }),
          fragment({ section: "development_area", text: "Obszar", key: "a1" }),
          fragment({
            section: "development_action",
            text: "Osierocone",
            areaKey: "brak",
          }),
        ],
      },
    );
    expect(result).toEqual({ inserted: 2, droppedActions: 1 });
    const rows = await t.run((ctx) => ctx.db.query("drafts").collect());
    const area = rows.find((d) => d.section === "development_area");
    const action = rows.find((d) => d.section === "development_action");
    expect(action?.relatedDraftId).toBe(area?._id);
    expect(rows.map((d) => d.text)).not.toContain("Osierocone");
  });
});

describe("regenerating around decided fragments", () => {
  const fragment = (patch: Record<string, unknown>) => ({
    section: "strength" as const,
    text: "Nowy",
    observationIds: [],
    noEvidence: true,
    ...patch,
  });

  it("keeps a proposed area that a decided action hangs on", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const area = await t.run((ctx) =>
      ctx.db.insert("drafts", {
        reviewId: w.review,
        section: "development_area",
        text: "Stary obszar",
        status: "proposed",
        createdAt: 1,
      }),
    );
    const action = await t.run((ctx) =>
      ctx.db.insert("drafts", {
        reviewId: w.review,
        section: "development_action",
        text: "Zaakceptowane działanie",
        status: "accepted",
        createdAt: 2,
        relatedDraftId: area,
      }),
    );
    await t.mutation(internal.drafting.mutations.replaceProposed, {
      reviewId: w.review,
      fragments: [],
    });
    expect(await t.run((ctx) => ctx.db.get(area))).not.toBeNull();
    const kept = (await t.run((ctx) => ctx.db.get(action))) as Doc<"drafts">;
    expect(kept.relatedDraftId).toBe(area);
  });

  it("adds no second justification for a criterion that is already justified, but does after a rejection", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    const justify = (criterionId: string, status: "accepted" | "rejected") =>
      t.run((ctx) =>
        ctx.db.insert("drafts", {
          reviewId: w.review,
          section: "criterion_justification",
          text: `${criterionId} ${status}`,
          status,
          createdAt: 1,
          criterionId,
        }),
      );
    await justify("komunikacja", "accepted");
    await justify("rzetelnosc", "rejected");
    const result = await t.mutation(
      internal.drafting.mutations.replaceProposed,
      {
        reviewId: w.review,
        fragments: [
          fragment({
            section: "criterion_justification",
            criterionId: "komunikacja",
            text: "Nowe komunikacja",
          }),
          fragment({
            section: "criterion_justification",
            criterionId: "rzetelnosc",
            text: "Nowe rzetelność",
          }),
        ],
      },
    );
    expect(result.inserted).toBe(1);
    const texts = (await t.run((ctx) => ctx.db.query("drafts").collect())).map(
      (d) => d.text,
    );
    expect(texts).toContain("Nowe rzetelność");
    expect(texts).not.toContain("Nowe komunikacja");
  });
});

describe("listForReview over every readable observation", () => {
  it("flags a mismatch even when the tagged observations are older than the model's 40", async () => {
    const t = convexTest(schema, modules);
    const w = await world(t);
    await observe(t, w, {
      date: "2025-02-01",
      sentiment: "development",
      criterionId: "komunikacja",
    });
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_OBSERVATIONS + 4; i++) {
        await ctx.db.insert("observations", {
          employeeId: w.employee,
          authorId: w.boss,
          date: "2026-03-01",
          text: `n${i}`,
          sentiment: "neutral",
          createdAt: 0,
        });
      }
    });
    const view = await t.query(api.drafting.queries.listForReview, {
      actor: actor("supervisor"),
      reviewId: w.review,
    });
    expect(view.observations).toEqual({
      used: MAX_OBSERVATIONS,
      total: MAX_OBSERVATIONS + 5,
    });
    const codes = view.inconsistencies.map((i) => [i.criterionId, i.code]);
    expect(codes).toContainEqual([
      "komunikacja",
      "high_rating_development_notes",
    ]);
    expect(codes).not.toContainEqual(["komunikacja", "no_observations"]);
  });
});
