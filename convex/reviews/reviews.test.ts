import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const supervisor = { role: "supervisor" as const };
const employee = { role: "employee" as const };

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  const candidates = await t.query(api.reviews.queries.candidates, {
    actor: supervisor,
  });
  const anna = candidates.find((c) => c.name.startsWith("Anna"))!;
  const reviewId = await t.mutation(api.reviews.mutations.start, {
    actor: supervisor,
    employeeId: anna._id,
  });
  return { t, reviewId, anna, candidates };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const save = (t: T, reviewId: Id<"reviews">, patch: object) =>
  t.mutation(api.reviews.mutations.save, {
    actor: supervisor,
    reviewId,
    patch,
  });
const advance = (t: T, reviewId: Id<"reviews">) =>
  t.mutation(api.reviews.mutations.advance, { actor: supervisor, reviewId });
const sign = (
  t: T,
  reviewId: Id<"reviews">,
  actor: { role: "supervisor" | "employee" },
  scope: "part_one" | "assessment",
) =>
  t.mutation(api.reviews.mutations.sign, {
    actor,
    reviewId,
    scope,
    place: "Warszawa",
  });
const view = (
  t: T,
  reviewId: Id<"reviews">,
  actor: { role: "supervisor" | "employee" } = supervisor,
) => t.query(api.reviews.queries.get, { actor, reviewId });

const MANDATORY_C = [
  "wykorzystywanie_wiedzy",
  "rzetelnosc",
  "organizacja_pracy",
  "wspolpraca",
  "komunikacja",
];

async function toWriting(t: T, reviewId: Id<"reviews">) {
  await save(t, reviewId, {
    openingConversationDate: "2026-01-12",
    expectations: MANDATORY_C.map((criterionId) => ({
      criterionId,
      text: "Oczekiwanie",
    })),
  });
  await sign(t, reviewId, supervisor, "part_one");
  await sign(t, reviewId, employee, "part_one");
  await advance(t, reviewId);
  await save(t, reviewId, {
    periodStart: "2026-01-12",
    periodEnd: "2026-11-01",
  });
  await advance(t, reviewId);
  await save(t, reviewId, { evaluationConversationDate: "2026-11-05" });
  await advance(t, reviewId);
}

const rate = (levelId: string) =>
  MANDATORY_C.map((criterionId) => ({ criterionId, levelId }));

describe("review wizard", () => {
  it("offers subordinates without an open review as candidates", async () => {
    const { t, candidates } = await setup();
    expect(candidates.map((c) => c.name)).toContain("Anna Przykładowa");
    const after = await t.query(api.reviews.queries.candidates, {
      actor: supervisor,
    });
    expect(after.map((c) => c.name)).not.toContain("Anna Przykładowa");
    expect(after.length).toBeGreaterThan(0);
  });

  it("runs a review from start to both signatures", async () => {
    const { t, reviewId } = await setup();
    const started = await view(t, reviewId);
    expect(started?.review.sheet).toBe("C");
    expect(started?.review.stage).toBe("opening");

    await toWriting(t, reviewId);
    await save(t, reviewId, {
      ratings: rate("7"),
      developmentPlan: { summary: "Szkolenie z analizy danych." },
    });
    await advance(t, reviewId);
    expect((await view(t, reviewId))?.review.stage).toBe("signing");

    await sign(t, reviewId, supervisor, "assessment");
    await sign(t, reviewId, employee, "assessment");

    const done = await view(t, reviewId);
    expect(done?.review.stage).toBe("objection_window");
    expect(done?.review.overallResult).toBe("positive");
    expect(done?.review.averageScore).toBe(7);
    expect(done?.review.signatures).toHaveLength(4);

    await t.mutation(api.reviews.mutations.close, {
      actor: supervisor,
      reviewId,
    });
    expect((await view(t, reviewId))?.review.stage).toBe("closed");
  });

  it("blocks advancing with formal gaps and lists them in Polish", async () => {
    const { t, reviewId } = await setup();
    await expect(advance(t, reviewId)).rejects.toThrow(
      /Brak daty rozmowy rozpoczynającej/,
    );
    expect((await view(t, reviewId))?.review.stage).toBe("opening");
    expect((await view(t, reviewId))?.gaps.length).toBeGreaterThan(0);
  });

  it("will not enter signing without justification and IPRZ conclusions", async () => {
    const { t, reviewId } = await setup();
    await toWriting(t, reviewId);
    await save(t, reviewId, { ratings: rate("1") });
    const error = await advance(t, reviewId).catch((e: Error) => e);
    expect(String(error)).toMatch(/Ocena negatywna wymaga uzasadnienia/);
    expect(String(error)).toMatch(/programu rozwoju zawodowego/);
    expect((await view(t, reviewId))?.review.stage).toBe("writing");
  });

  it("allows at most 3 additional criteria in the mutation", async () => {
    const { t, reviewId } = await setup();
    await expect(
      save(t, reviewId, {
        additionalCriteria: [
          "kreatywnosc",
          "negocjowanie",
          "sytuacje_kryzysowe",
          "myslenie_analityczne",
        ],
      }),
    ).rejects.toThrow(/najwyżej 3 kryteria dodatkowe/);
    await save(t, reviewId, {
      additionalCriteria: ["kreatywnosc", "negocjowanie", "sytuacje_kryzysowe"],
    });
  });

  it("locks part I after a confirmation", async () => {
    const { t, reviewId } = await setup();
    await save(t, reviewId, {
      openingConversationDate: "2026-01-12",
      expectations: MANDATORY_C.map((criterionId) => ({
        criterionId,
        text: "x",
      })),
    });
    await sign(t, reviewId, supervisor, "part_one");
    await expect(
      save(t, reviewId, { additionalCriteria: ["kreatywnosc"] }),
    ).rejects.toThrow(/zablokowane/);
  });

  it("rejects non-calendar dates", async () => {
    const { t, reviewId } = await setup();
    await expect(
      save(t, reviewId, { openingConversationDate: "2026-02-30" }),
    ).rejects.toThrow(/YYYY-MM-DD/);
  });

  it("lets the employee read and sign but not edit", async () => {
    const { t, reviewId } = await setup();
    const asEmployee = await view(t, reviewId, employee);
    expect(asEmployee?.can.edit).toBe(false);
    expect(asEmployee?.can.asEmployee).toBe(true);
    await expect(
      t.mutation(api.reviews.mutations.save, {
        actor: employee,
        reviewId,
        patch: { openingConversationDate: "2026-01-12" },
      }),
    ).rejects.toThrow(/tylko oceniający/);
    await expect(
      t.mutation(api.reviews.mutations.advance, {
        actor: employee,
        reviewId,
      }),
    ).rejects.toThrow(/tylko oceniający/);
    await save(t, reviewId, {
      openingConversationDate: "2026-01-12",
      expectations: MANDATORY_C.map((criterionId) => ({
        criterionId,
        text: "x",
      })),
    });
    await sign(t, reviewId, employee, "part_one");
    expect((await view(t, reviewId))?.review.signatures).toHaveLength(1);
  });

  it("hides the review from an unrelated employee", async () => {
    const { t, reviewId } = await setup();
    // The demo role is a single persona, so hand it to someone else.
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("employees").collect();
      const anna = rows.find((e) => e.firstName === "Anna")!;
      await ctx.db.patch(anna._id, { demoPersona: undefined });
      await ctx.db.insert("employees", {
        firstName: "Obcy",
        lastName: "Pracownik",
        position: "x",
        unit: "x",
        createdAt: 0,
        corpsRole: "official",
        demoPersona: "employee",
      });
    });
    expect(await view(t, reviewId, employee)).toBeNull();
  });

  it("requires the departing evaluator's opinion to leave the observation stage", async () => {
    const { t, reviewId } = await setup();
    await save(t, reviewId, {
      openingConversationDate: "2026-01-12",
      expectations: MANDATORY_C.map((criterionId) => ({
        criterionId,
        text: "x",
      })),
    });
    await sign(t, reviewId, supervisor, "part_one");
    await sign(t, reviewId, employee, "part_one");
    await advance(t, reviewId);
    await save(t, reviewId, {
      periodStart: "2026-01-12",
      periodEnd: "2026-11-01",
      staffingSituations: [{ kind: "evaluator_change", from: "2026-09-01" }],
    });
    await expect(advance(t, reviewId)).rejects.toThrow(
      /opinii odchodzącego oceniającego/,
    );
    await save(t, reviewId, {
      staffingSituations: [
        {
          kind: "evaluator_change",
          from: "2026-09-01",
          note: "Dobra współpraca, rzetelna praca.",
        },
      ],
    });
    await advance(t, reviewId);
    expect((await view(t, reviewId))?.review.stage).toBe("evaluation");
  });
});

describe("review wizard staffing situations", () => {
  it("does not let the evaluator drop a seeded situation or edit it outside observation", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.employees.seed.run, {});
    const radca = (
      await t.query(api.reviews.queries.candidates, { actor: supervisor })
    ).find((c) => c.name.startsWith("Tomasz"))!;
    const reviewId = await t.mutation(api.reviews.mutations.start, {
      actor: supervisor,
      employeeId: radca._id,
    });
    await expect(save(t, reviewId, { staffingSituations: [] })).rejects.toThrow(
      /Sytuacje kadrowe edytuje się na etapie/,
    );
  });
});
