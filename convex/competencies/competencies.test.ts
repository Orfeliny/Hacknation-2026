import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const supervisor = { role: "supervisor" as const };
const employee = { role: "employee" as const };
const hr = { role: "hr" as const };
const director = { role: "director" as const };

async function setup(stage: Doc<"reviews">["stage"] = "evaluation") {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  await t.mutation(internal.observations.seed.run, {});
  const key = (seedKey: string) =>
    t.run(
      async (ctx) =>
        (await ctx.db
          .query("employees")
          .withIndex("by_seedKey", (q) => q.eq("seedKey", seedKey))
          .unique())!._id,
    );
  const anna = await key("anna");
  const boss = await key("naczelnik");
  const reviewId = await t.run((ctx) =>
    ctx.db.insert("reviews", {
      employeeId: anna,
      evaluatorId: boss,
      stage,
      sheet: "C",
      periodStart: "2025-01-01",
      createdAt: 0,
    }),
  );
  const open = (competencyId = "rzetelnosc") =>
    t.mutation(api.competencies.mutations.open, {
      actor: supervisor,
      employeeId: anna,
      competencyId,
      reviewId,
    });
  const setStage = (next: Doc<"reviews">["stage"]) =>
    t.run((ctx) => ctx.db.patch(reviewId, { stage: next }));
  const row = (id: Id<"competencyAssessments">) =>
    t.run((ctx) => ctx.db.get(id));
  return { t, anna, boss, reviewId, open, setStage, row, key };
}

const choose = (...levels: (string | undefined)[]) =>
  levels.map((levelId, i) => ({ indicatorId: `rzetelnosc-${i + 1}`, levelId }));

describe("model query", () => {
  it("returns the competencies with per-level descriptions and the demo flag", async () => {
    const t = convexTest(schema, modules);
    const model = await t.query(api.competencies.queries.model, {});
    expect(model.isDemo).toBe(true);
    expect(model.competencies).toHaveLength(14);
    expect(model.competencies[0].indicators[0].levels["5"]).toBeTruthy();
    expect(model.rule.join(" ")).toMatch(/mediana/);
  });
});

describe("open", () => {
  it("starts an assessment once and returns the same one afterwards", async () => {
    const { t, open, row, anna, boss, reviewId } = await setup();
    const first = await open();
    expect(await open()).toBe(first);
    expect(await row(first)).toMatchObject({
      employeeId: anna,
      assessorId: boss,
      reviewId,
      competencyId: "rzetelnosc",
      criterionId: "rzetelnosc",
      modelVersion: "demo-2026-11-21",
      indicatorChoices: [],
    });
    const audit = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entity", "competencyAssessment").eq("entityId", first),
        )
        .collect(),
    );
    expect(audit).toMatchObject([{ action: "create", reviewId }]);
  });

  it("refuses a criterion that is not on the review and an unknown competency", async () => {
    const { open } = await setup();
    await expect(open("negocjowanie")).rejects.toThrow(/nie jest wybrane/);
    await expect(open("empatia")).rejects.toThrow(/nie ma w obecnej wersji/);
  });

  it("lets only the evaluator write; the employee, HR and others are refused", async () => {
    const { t, anna, reviewId, key } = await setup();
    for (const actor of [employee, hr, director]) {
      await expect(
        t.mutation(api.competencies.mutations.open, {
          actor,
          employeeId: anna,
          competencyId: "rzetelnosc",
          reviewId,
        }),
      ).rejects.toThrow(/oceniający/);
    }
    // Outside a review the direct supervisor assesses; nobody assesses themselves.
    const boss = await key("naczelnik");
    await expect(
      t.mutation(api.competencies.mutations.open, {
        actor: supervisor,
        employeeId: boss,
        competencyId: "rzetelnosc",
      }),
    ).rejects.toThrow(/bezpośredni przełożony/);
    const standalone = await t.mutation(api.competencies.mutations.open, {
      actor: supervisor,
      employeeId: anna,
      competencyId: "kreatywnosc",
    });
    expect(standalone).toBeTruthy();
  });

  it("refuses a review of another employee", async () => {
    const { t, reviewId, key } = await setup();
    await expect(
      t.mutation(api.competencies.mutations.open, {
        actor: supervisor,
        employeeId: await key("radca"),
        competencyId: "rzetelnosc",
        reviewId,
      }),
    ).rejects.toThrow(/nie dotyczy tego pracownika/);
  });

  it("is closed for writing once the review left the editable stages", async () => {
    const { t, open, setStage } = await setup();
    const id = await open();
    await setStage("signing");
    await expect(open()).rejects.toThrow(/Na tym etapie/);
    await expect(
      t.mutation(api.competencies.mutations.saveChoices, {
        actor: supervisor,
        assessmentId: id,
        choices: choose("5", "5"),
      }),
    ).rejects.toThrow(/Na tym etapie/);
  });
});

describe("saveChoices and the live suggestion", () => {
  it("stores the choices in model order and the suggestion with its explanation", async () => {
    const { t, open, row } = await setup();
    const id = await open();
    const saved = await t.mutation(api.competencies.mutations.saveChoices, {
      actor: supervisor,
      assessmentId: id,
      choices: [{ indicatorId: "rzetelnosc-2", levelId: "5" }],
    });
    expect(saved.suggestion).toMatchObject({ levelId: "5", observed: 1 });
    expect(await row(id)).toMatchObject({
      indicatorChoices: [
        { indicatorId: "rzetelnosc-1" },
        { indicatorId: "rzetelnosc-2", levelId: "5" },
      ],
      suggestedLevel: "5",
    });

    const view = await t.query(api.competencies.queries.get, {
      actor: supervisor,
      assessmentId: id,
    });
    expect(view?.audience).toBe("assessor");
    expect(view?.can.edit).toBe(true);
    expect(view?.model.isDemo).toBe(true);
    expect(view?.competency?.indicators).toHaveLength(2);
    expect(view?.assessment).toMatchObject({
      status: "draft",
      suggestedLevel: "5",
      suggestedLabel: "na poziomie oczekiwań",
      finalLevel: null,
    });
    expect(view?.assessment.suggestion?.rule).toBe("median_odd");
    expect(view?.assessment.suggestion?.steps.length).toBeGreaterThan(1);
  });

  it("clears the stored suggestion when the choices no longer support one", async () => {
    const { t, open, row } = await setup();
    const id = await open();
    const save = (choices: { indicatorId: string; levelId?: string }[]) =>
      t.mutation(api.competencies.mutations.saveChoices, {
        actor: supervisor,
        assessmentId: id,
        choices,
      });
    await save(choose("3", "5"));
    expect((await row(id))?.suggestedLevel).toBe("5");
    const result = await save(choose(undefined, undefined));
    expect(result.suggestion.rule).toBe("insufficient_observations");
    expect((await row(id))?.suggestedLevel).toBeUndefined();
  });

  it("rejects unknown indicators and levels with a readable message", async () => {
    const { t, open } = await setup();
    const id = await open();
    await expect(
      t.mutation(api.competencies.mutations.saveChoices, {
        actor: supervisor,
        assessmentId: id,
        choices: [{ indicatorId: "komunikacja-1", levelId: "5" }],
      }),
    ).rejects.toThrow(/Nieznany wskaźnik: komunikacja-1/);
    await expect(
      t.mutation(api.competencies.mutations.saveChoices, {
        actor: supervisor,
        assessmentId: id,
        choices: choose("4"),
      }),
    ).rejects.toThrow(/Nieznany poziom: 4/);
  });
});

describe("setFinal", () => {
  async function withChoices(...levels: (string | undefined)[]) {
    const context = await setup();
    const id = await context.open();
    await context.t.mutation(api.competencies.mutations.saveChoices, {
      actor: supervisor,
      assessmentId: id,
      choices: choose(...levels),
    });
    const setFinal = (finalLevel: string, deviationJustification?: string) =>
      context.t.mutation(api.competencies.mutations.setFinal, {
        actor: supervisor,
        assessmentId: id,
        finalLevel,
        deviationJustification,
      });
    return { ...context, id, setFinal };
  }

  it("accepts the suggested level without a justification", async () => {
    const { setFinal, row, id, t } = await withChoices("7", "7");
    expect(await setFinal("7")).toEqual({
      finalLevel: "7",
      suggestedLevel: "7",
      deviation: false,
    });
    expect(await row(id)).toMatchObject({
      finalLevel: "7",
      suggestedLevel: "7",
    });
    expect((await row(id))?.deviationJustification).toBeUndefined();
    const audit = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entity", "competencyAssessment").eq("entityId", id),
        )
        .collect(),
    );
    expect(audit.at(-1)?.details).toBe("final=7 suggested=7 deviation=no");
  });

  it("requires a non-empty justification for a level other than the suggestion", async () => {
    const { setFinal, row, id } = await withChoices("7", "7");
    await expect(setFinal("5")).rejects.toThrow(/różni się od sugerowanego/);
    await expect(setFinal("5", "   ")).rejects.toThrow(
      /różni się od sugerowanego/,
    );
    await expect(setFinal("5", "x".repeat(1001))).rejects.toThrow(/1000/);
    await setFinal("5", "  Terminy dotrzymane tylko po przypomnieniach.  ");
    expect(await row(id)).toMatchObject({
      finalLevel: "5",
      suggestedLevel: "7",
      deviationJustification: "Terminy dotrzymane tylko po przypomnieniach.",
    });
  });

  it("lets the evaluator decide without a suggestion, with a justification", async () => {
    const { setFinal, row, id } = await withChoices(undefined, undefined);
    await expect(setFinal("3")).rejects.toThrow(/nie zasugerował poziomu/);
    await setFinal("3", "Za mało obserwacji, ocena z rozmowy oceniającej.");
    expect(await row(id)).toMatchObject({ finalLevel: "3" });
    expect((await row(id))?.suggestedLevel).toBeUndefined();
  });

  it("rejects a level outside the model and a caller who is not the evaluator", async () => {
    const { setFinal, t, id } = await withChoices("5", "5");
    await expect(setFinal("4")).rejects.toThrow(/Nieznany poziom/);
    await expect(
      t.mutation(api.competencies.mutations.setFinal, {
        actor: hr,
        assessmentId: id,
        finalLevel: "5",
      }),
    ).rejects.toThrow(/oceniający/);
  });

  it("withdraws the final level when the choices change, and keeps it when they do not", async () => {
    const { setFinal, t, row, id } = await withChoices("5", "5");
    await setFinal("7", "Ponad oczekiwania w drugim roku.");
    const save = (...levels: (string | undefined)[]) =>
      t.mutation(api.competencies.mutations.saveChoices, {
        actor: supervisor,
        assessmentId: id,
        choices: choose(...levels),
      });
    expect((await save("5", "5")).finalWithdrawn).toBe(false);
    expect((await row(id))?.finalLevel).toBe("7");
    expect((await save("5", "7")).finalWithdrawn).toBe(true);
    const after = await row(id);
    expect(after?.finalLevel).toBeUndefined();
    expect(after?.deviationJustification).toBeUndefined();
  });
});

describe("reading by role", () => {
  async function decided() {
    const context = await setup();
    const id = await context.open();
    await context.t.mutation(api.competencies.mutations.saveChoices, {
      actor: supervisor,
      assessmentId: id,
      choices: choose("3", "5"),
    });
    await context.t.mutation(api.competencies.mutations.setFinal, {
      actor: supervisor,
      assessmentId: id,
      finalLevel: "3",
      deviationJustification: "Dwa opóźnione sprawozdania.",
    });
    await context.open("komunikacja");
    return { ...context, id };
  }

  it("lets HR read the draft and the explanation but not edit", async () => {
    const { t, id } = await decided();
    const view = await t.query(api.competencies.queries.get, {
      actor: hr,
      assessmentId: id,
    });
    expect(view?.audience).toBe("hr");
    expect(view?.can.edit).toBe(false);
    expect(view?.assessment.indicatorChoices).toHaveLength(2);
    expect(view?.assessment.deviationJustification).toBe(
      "Dwa opóźnione sprawozdania.",
    );
  });

  it("shows the employee nothing while the review is being written", async () => {
    const { t, id, anna, reviewId } = await decided();
    expect(
      await t.query(api.competencies.queries.get, {
        actor: employee,
        assessmentId: id,
      }),
    ).toBeNull();
    expect(
      await t.query(api.competencies.queries.listForEmployee, {
        actor: employee,
        employeeId: anna,
        reviewId,
      }),
    ).toMatchObject({
      audience: "employee",
      finalsVisible: false,
      assessments: [],
    });
  });

  it("shows the employee only their final levels once the review is signed", async () => {
    const { t, id, anna, reviewId, setStage } = await decided();
    await setStage("signing");
    const view = await t.query(api.competencies.queries.get, {
      actor: employee,
      assessmentId: id,
    });
    expect(view?.audience).toBe("employee");
    expect(view?.can.edit).toBe(false);
    expect(view?.assessment).toMatchObject({
      finalLevel: "3",
      finalLabel: "poniżej oczekiwań",
      indicatorChoices: [],
      suggestedLevel: null,
      suggestion: null,
      deviationJustification: null,
      assessorId: null,
    });
    const listed = await t.query(api.competencies.queries.listForEmployee, {
      actor: employee,
      employeeId: anna,
      reviewId,
    });
    expect(listed.can.edit).toBe(false);
    expect(listed.assessments.map((a) => a.competencyId)).toEqual([
      "rzetelnosc",
    ]);
  });

  it("lists drafts and finals for the evaluator, who can edit", async () => {
    const { t, anna, reviewId } = await decided();
    const listed = await t.query(api.competencies.queries.listForEmployee, {
      actor: supervisor,
      employeeId: anna,
      reviewId,
    });
    expect(listed).toMatchObject({
      audience: "assessor",
      isDemo: true,
      can: { edit: true },
    });
    expect(listed.assessments.map((a) => [a.competencyId, a.status])).toEqual([
      ["rzetelnosc", "final"],
      ["komunikacja", "draft"],
    ]);
  });

  it("refuses other employees' assessments to an unrelated role", async () => {
    const { t, anna, reviewId, id } = await decided();
    await expect(
      t.query(api.competencies.queries.listForEmployee, {
        actor: director,
        employeeId: anna,
        reviewId,
      }),
    ).rejects.toThrow(/oceniający, kadry/);
    expect(
      await t.query(api.competencies.queries.get, {
        actor: director,
        assessmentId: id,
      }),
    ).toBeNull();
  });
});

describe("forReview", () => {
  it("lists every criterion of the review with the evaluator's final level", async () => {
    const { t, open, reviewId } = await setup();
    const id = await open();
    await t.mutation(api.competencies.mutations.saveChoices, {
      actor: supervisor,
      assessmentId: id,
      choices: choose("7", "9"),
    });
    await t.mutation(api.competencies.mutations.setFinal, {
      actor: supervisor,
      assessmentId: id,
      finalLevel: "7",
    });
    await open("komunikacja");
    const result = await t.query(api.competencies.queries.forReview, {
      actor: supervisor,
      reviewId,
    });
    expect(result?.isDemo).toBe(true);
    expect(result?.criteria.map((c) => c.criterionId)).toEqual([
      "wykorzystywanie_wiedzy",
      "rzetelnosc",
      "organizacja_pracy",
      "wspolpraca",
      "komunikacja",
    ]);
    const byId = new Map(
      result!.criteria.map((c) => [c.criterionId, c.assessment]),
    );
    expect(byId.get("rzetelnosc")).toMatchObject({
      status: "final",
      finalLevel: "7",
      suggestedLevel: "7",
    });
    expect(byId.get("komunikacja")).toMatchObject({ status: "draft" });
    expect(byId.get("wspolpraca")).toBeNull();
  });

  it("returns nothing to a director or admin who is not the evaluator", async () => {
    const { t, open, reviewId } = await setup();
    await open();
    for (const actor of [director, { role: "admin" as const }]) {
      expect(
        await t.query(api.competencies.queries.forReview, { actor, reviewId }),
      ).toBeNull();
    }
  });

  it("keeps finals hidden from the employee in the setup stage", async () => {
    const { t, open, reviewId, setStage } = await setup();
    await open();
    await setStage("setup");
    const result = await t.query(api.competencies.queries.forReview, {
      actor: employee,
      reviewId,
    });
    expect(result?.finalsVisible ?? false).toBe(false);
  });

  it("gives the employee final levels only after the review is signed", async () => {
    const { t, open, reviewId, setStage } = await setup();
    const id = await open();
    await t.mutation(api.competencies.mutations.saveChoices, {
      actor: supervisor,
      assessmentId: id,
      choices: choose("5", "5"),
    });
    await t.mutation(api.competencies.mutations.setFinal, {
      actor: supervisor,
      assessmentId: id,
      finalLevel: "5",
    });
    await open("komunikacja");
    const before = await t.query(api.competencies.queries.forReview, {
      actor: employee,
      reviewId,
    });
    expect(before?.finalsVisible).toBe(false);
    expect(before?.criteria.every((c) => c.assessment === null)).toBe(true);
    await setStage("objection_window");
    const after = await t.query(api.competencies.queries.forReview, {
      actor: employee,
      reviewId,
    });
    const assessed = after!.criteria.filter((c) => c.assessment !== null);
    expect(assessed).toHaveLength(1);
    expect(assessed[0].assessment).toMatchObject({
      criterionId: "rzetelnosc",
      finalLevel: "5",
      suggestion: null,
    });
    expect(
      await t.query(api.competencies.queries.forReview, {
        actor: director,
        reviewId,
      }),
    ).toBeNull();
  });
});

describe("observation preview (D11)", () => {
  async function withNotes() {
    const context = await setup();
    const other = await context.key("dyrektor-departamentu");
    await context.t.run(async (ctx) => {
      const note = {
        employeeId: context.anna,
        sentiment: "neutral" as const,
        criterionId: "komunikacja",
        createdAt: 0,
      };
      await ctx.db.insert("observations", {
        ...note,
        authorId: context.boss,
        date: "2026-03-01",
        text: "Przeciążenie po urlopie koleżanki.",
        wellbeing: true,
      });
      await ctx.db.insert("observations", {
        ...note,
        authorId: other,
        date: "2026-03-02",
        text: "Notatka innego przełożonego.",
      });
    });
    return context;
  }

  it("shows the evaluator their own notes on the criterion, without wellbeing notes", async () => {
    const { t, open } = await withNotes();
    const preview = await t.query(api.competencies.queries.observations, {
      actor: supervisor,
      assessmentId: await open("komunikacja"),
    });
    expect(preview?.criterionId).toBe("komunikacja");
    expect(preview?.items.map((o) => o.date)).toEqual(["2026-02-03"]);
  });

  it("lets HR read every author's notes", async () => {
    const { t, open } = await withNotes();
    const preview = await t.query(api.competencies.queries.observations, {
      actor: hr,
      assessmentId: await open("komunikacja"),
    });
    expect(preview?.items.map((o) => o.date)).toEqual([
      "2026-03-02",
      "2026-02-03",
    ]);
  });

  it("leaves out notes from before the review period", async () => {
    const { t, reviewId, open } = await setup();
    const id = await open("organizacja_pracy");
    const dates = async () =>
      (
        await t.query(api.competencies.queries.observations, {
          actor: supervisor,
          assessmentId: id,
        })
      )?.items.map((o) => o.date);
    expect(await dates()).toEqual(["2025-06-12"]);
    await t.run((ctx) => ctx.db.patch(reviewId, { periodStart: "2025-07-01" }));
    expect(await dates()).toEqual([]);
  });

  it("never shows the employee the notes about them", async () => {
    const { t, open } = await setup();
    const id = await open();
    await expect(
      t.query(api.competencies.queries.observations, {
        actor: employee,
        assessmentId: id,
      }),
    ).rejects.toThrow(/nie są dostępne dla ocenianego/);
  });
});

describe("first review path (Kompas)", () => {
  async function withFirstReview() {
    const context = await setup();
    const firstReviewId = await context.t.run((ctx) =>
      ctx.db.insert("firstReviews", {
        employeeId: context.anna,
        evaluatorId: context.boss,
        stage: "assessment",
        startDate: "2026-01-01",
        createdAt: 0,
      }),
    );
    const openFirst = (
      competencyId: string,
      actor: { role: "supervisor" | "hr" } = supervisor,
    ) =>
      context.t.mutation(api.competencies.mutations.open, {
        actor,
        employeeId: context.anna,
        competencyId,
        firstReviewId,
      });
    return { ...context, firstReviewId, openFirst };
  }

  it("keeps first-review assessments apart from the periodic review", async () => {
    const { t, anna, firstReviewId, openFirst, row, open, reviewId } =
      await withFirstReview();
    const id = await openFirst("negocjowanie");
    expect(await openFirst("negocjowanie")).toBe(id);
    expect(await row(id)).toMatchObject({
      firstReviewId,
      criterionId: "negocjowanie",
    });
    expect((await row(id))?.reviewId).toBeUndefined();
    await open();
    const list = (link: object) =>
      t.query(api.competencies.queries.listForEmployee, {
        actor: supervisor,
        employeeId: anna,
        ...link,
      });
    const ids = async (link: object) =>
      (await list(link)).assessments.map((a) => a.competencyId);
    expect(await ids({ firstReviewId })).toEqual(["negocjowanie"]);
    expect(await ids({ reviewId })).toEqual(["rzetelnosc"]);
    expect(await ids({})).toEqual([]);
  });

  it("refuses both links at once, other writers and writes after the assessment stage", async () => {
    const { t, anna, firstReviewId, reviewId, openFirst } =
      await withFirstReview();
    await expect(
      t.mutation(api.competencies.mutations.open, {
        actor: supervisor,
        employeeId: anna,
        competencyId: "rzetelnosc",
        reviewId,
        firstReviewId,
      }),
    ).rejects.toThrow(/okresowej albo pierwszej/);
    await expect(openFirst("rzetelnosc", hr)).rejects.toThrow(/oceniający/);
    await t.run((ctx) => ctx.db.patch(firstReviewId, { stage: "signing" }));
    await expect(openFirst("rzetelnosc")).rejects.toThrow(/Na tym etapie/);
  });

  it("shows the employee the final level once the first review is being signed", async () => {
    const { t, anna, firstReviewId, openFirst } = await withFirstReview();
    const id = await openFirst("rzetelnosc");
    await t.mutation(api.competencies.mutations.setFinal, {
      actor: supervisor,
      assessmentId: id,
      finalLevel: "5",
      deviationJustification: "Ocena z okresu próbnego.",
    });
    const list = () =>
      t.query(api.competencies.queries.listForEmployee, {
        actor: employee,
        employeeId: anna,
        firstReviewId,
      });
    expect((await list()).assessments).toEqual([]);
    await t.run((ctx) => ctx.db.patch(firstReviewId, { stage: "signing" }));
    expect((await list()).assessments).toMatchObject([
      { finalLevel: "5", deviationJustification: null },
    ]);
  });
});
