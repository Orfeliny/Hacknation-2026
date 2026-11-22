import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { DemoRole } from "../lib/validators";
import schema from "../schema";
import { MAX_LISTED } from "./queries";

const modules = import.meta.glob("/convex/**/*.*s");

// 2026-11-20 23:30 UTC is already 2026-11-21 in Warsaw.
const SIGNED_AT = Date.UTC(2026, 10, 20, 23, 30);

afterEach(() => {
  vi.unstubAllEnvs();
});

type Ids = {
  supervisor: Id<"employees">;
  employee: Id<"employees">;
  stranger: Id<"employees">;
  review: Id<"reviews">;
};

async function seed(t: ReturnType<typeof convexTest>): Promise<Ids> {
  return await t.run(async (ctx) => {
    const base = {
      position: "Specjalista",
      unit: "Wydział Kadr",
      createdAt: 0,
    };
    const supervisor = await ctx.db.insert("employees", {
      ...base,
      firstName: "Andrzej",
      lastName: "Jacentowski",
      position: "Naczelnik Wydziału",
      demoPersona: "supervisor",
    });
    const employee = await ctx.db.insert("employees", {
      ...base,
      firstName: "Anna",
      lastName: "Rokicińska",
      corpsRole: "official",
      serviceGrade: 3,
      serviceGradeSince: "2022-03-01",
      appointmentYear: 2019,
      supervisorId: supervisor,
      demoPersona: "employee",
    });
    const stranger = await ctx.db.insert("employees", {
      ...base,
      firstName: "Ewa",
      lastName: "Obca",
    });
    const review = await ctx.db.insert("reviews", {
      employeeId: employee,
      evaluatorId: supervisor,
      stage: "signing",
      createdAt: 1,
      sheet: "C",
      rulesVersion: "2016-04-23",
      dueDate: "2026-12-01",
      openingConversationDate: "2024-12-02",
      evaluationConversationDate: "2026-11-18",
      periodStart: "2024-12-02",
      periodEnd: "2026-11-19",
      additionalCriteria: ["kreatywnosc"],
      ratings: [
        { criterionId: "rzetelnosc", levelId: "7" },
        {
          criterionId: "kreatywnosc",
          levelId: "5",
          justification: "Nowe rozwiązania.",
        },
      ],
      averageScore: 6,
      overallResult: "positive",
      overallLevelId: "na_poziomie_oczekiwan",
      overallJustification: "Rzetelna praca.",
      previousReview: {
        result: "positive",
        levelId: "powyzej_oczekiwan",
        date: "2024-11-20",
      },
      developmentPlan: {
        summary: "Szkolenie z analizy danych.",
        strengths: ["Dokładność"],
        areas: [{ id: "a1", text: "Prezentacje" }],
        actions: [{ areaId: "a1", kind: "training", text: "Kurs wystąpień" }],
      },
      promotionRequest: {
        requested: true,
        justification: "Ponadprzeciętne wyniki.",
      },
      signatures: [
        {
          role: "evaluator",
          signerId: supervisor,
          signedAt: SIGNED_AT,
          place: "Warszawa",
          scope: "assessment",
        },
        {
          role: "employee",
          signerId: employee,
          signedAt: SIGNED_AT,
          deemedById: supervisor,
        },
      ],
      objection: {
        filedAt: 5,
        text: "Nie zgadzam się.",
        addressee: "Dyrektor",
      },
    });
    return { supervisor, employee, stranger, review };
  });
}

const actor = (role: DemoRole) => ({ role });

describe("print.queries.getSheet", () => {
  it.each(["supervisor", "employee"] as const)(
    "lets the %s of the review read it",
    async (role) => {
      const t = convexTest(schema, modules);
      const { review } = await seed(t);
      const sheet = await t.query(api.print.queries.getSheet, {
        actor: actor(role),
        reviewId: review,
      });
      expect(sheet?.reviewId).toBe(review);
    },
  );

  it.each(["hr", "director", "admin"] as const)(
    "lets the %s role read any review, even without a seeded persona",
    async (role) => {
      const t = convexTest(schema, modules);
      const { review } = await seed(t);
      const sheet = await t.query(api.print.queries.getSheet, {
        actor: actor(role),
        reviewId: review,
      });
      expect(sheet?.sheet).toBe("C");
    },
  );

  it("returns null for a supervisor or employee who is not part of the review", async () => {
    const t = convexTest(schema, modules);
    const { review, stranger, supervisor, employee } = await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(supervisor, { demoPersona: undefined });
      await ctx.db.patch(employee, { demoPersona: undefined });
      await ctx.db.patch(stranger, { demoPersona: "supervisor" });
    });
    await expect(
      t.query(api.print.queries.getSheet, {
        actor: actor("supervisor"),
        reviewId: review,
      }),
    ).resolves.toBeNull();
  });

  it("returns null for an employee persona that is not the employee of the review", async () => {
    const t = convexTest(schema, modules);
    const { review, stranger, employee } = await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(employee, { demoPersona: undefined });
      await ctx.db.patch(stranger, { demoPersona: "employee" });
    });
    await expect(
      t.query(api.print.queries.getSheet, {
        actor: actor("employee"),
        reviewId: review,
      }),
    ).resolves.toBeNull();
  });

  it("returns null for a role with no seeded persona", async () => {
    const t = convexTest(schema, modules);
    const { review } = await seed(t);
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("employees").collect();
      for (const row of rows)
        await ctx.db.patch(row._id, { demoPersona: undefined });
    });
    await expect(
      t.query(api.print.queries.getSheet, {
        actor: actor("employee"),
        reviewId: review,
      }),
    ).resolves.toBeNull();
  });

  it("returns the fields printed on the sheet", async () => {
    const t = convexTest(schema, modules);
    const { review } = await seed(t);
    vi.stubEnv("OFFICE_NAME", "  Urząd Analiz Strategicznych ");
    const sheet = await t.query(api.print.queries.getSheet, {
      actor: actor("hr"),
      reviewId: review,
    });
    expect(sheet).toMatchObject({
      officeName: "Urząd Analiz Strategicznych",
      rulesVersion: "2016-04-23",
      sheet: "C",
      stage: "signing",
      stageLabel: "Podpisy",
      employee: { firstName: "Anna", unit: "Wydział Kadr", isOfficial: true },
      evaluator: { lastName: "Jacentowski" },
      dueDate: "2026-12-01",
      evaluationConversationDate: "2026-11-18",
      additionalCriteria: ["kreatywnosc"],
      averageScore: 6,
      overallResult: "positive",
      overallLevelId: "na_poziomie_oczekiwan",
      previousReview: { result: "positive", levelId: "powyzej_oczekiwan" },
      developmentPlan: { summary: "Szkolenie z analizy danych." },
      objectionAddressee: "Dyrektor",
    });
    expect(sheet?.ratings).toHaveLength(2);
    expect(sheet?.ratings[0]?.justification).toBeNull();
    expect(sheet?.promotionRequest).toEqual({
      requested: true,
      justification: "Ponadprzeciętne wyniki.",
      appointmentYear: 2019,
      currentGrade: 3,
      currentGradeSince: "2022-03-01",
    });
  });

  it("uses the Warsaw calendar day and marks a deemed acknowledgement", async () => {
    const t = convexTest(schema, modules);
    const { review } = await seed(t);
    const sheet = await t.query(api.print.queries.getSheet, {
      actor: actor("hr"),
      reviewId: review,
    });
    expect(sheet?.signatures).toEqual([
      {
        role: "evaluator",
        scope: "assessment",
        place: "Warszawa",
        date: "2026-11-21",
        deemedAcknowledgement: false,
      },
      {
        role: "employee",
        scope: null,
        place: null,
        date: "2026-11-21",
        deemedAcknowledgement: true,
      },
    ]);
  });

  it("leaves the office name blank when it is not configured and tolerates a review at setup", async () => {
    const t = convexTest(schema, modules);
    const { employee, supervisor } = await seed(t);
    const bare = await t.run((ctx) =>
      ctx.db.insert("reviews", {
        employeeId: employee,
        evaluatorId: supervisor,
        stage: "setup",
        createdAt: 2,
      }),
    );
    const sheet = await t.query(api.print.queries.getSheet, {
      actor: actor("hr"),
      reviewId: bare,
    });
    expect(sheet).toMatchObject({
      officeName: "",
      stageLabel: "Przygotowanie",
      sheet: null,
      ratings: [],
      additionalCriteria: [],
      signatures: [],
      developmentPlan: null,
      promotionRequest: null,
      objectionAddressee: null,
    });
  });

  it("returns null for an unknown review", async () => {
    const t = convexTest(schema, modules);
    const { review } = await seed(t);
    await t.run((ctx) => ctx.db.delete(review));
    await expect(
      t.query(api.print.queries.getSheet, {
        actor: actor("hr"),
        reviewId: review,
      }),
    ).resolves.toBeNull();
  });
});

describe("print.queries.listPrintable", () => {
  it("lists the reviews the actor takes part in, and all of them for hr", async () => {
    const t = convexTest(schema, modules);
    const { employee, supervisor, stranger, review } = await seed(t);
    const other = await t.run((ctx) =>
      ctx.db.insert("reviews", {
        employeeId: stranger,
        evaluatorId: stranger,
        stage: "setup",
        createdAt: 3,
      }),
    );
    const own = await t.query(api.print.queries.listPrintable, {
      actor: actor("employee"),
    });
    expect(own.map((row) => row.reviewId)).toEqual([review]);
    expect(own[0]).toMatchObject({
      employeeName: "Anna Rokicińska",
      stageLabel: "Podpisy",
      sheet: "C",
      round: 1,
    });
    const evaluated = await t.query(api.print.queries.listPrintable, {
      actor: actor("supervisor"),
    });
    expect(evaluated.map((row) => row.reviewId)).toEqual([review]);
    const all = await t.query(api.print.queries.listPrintable, {
      actor: actor("hr"),
    });
    expect(all.map((row) => row.reviewId).sort()).toEqual(
      [other, review].sort(),
    );
    expect(employee).not.toBe(supervisor);
  });

  it("returns nothing for a role without a persona", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("employees").collect()) {
        await ctx.db.patch(row._id, { demoPersona: undefined });
      }
    });
    expect(
      await t.query(api.print.queries.listPrintable, {
        actor: actor("supervisor"),
      }),
    ).toEqual([]);
  });

  it("caps the list", async () => {
    const t = convexTest(schema, modules);
    const { employee, supervisor } = await seed(t);
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_LISTED + 5; i++) {
        await ctx.db.insert("reviews", {
          employeeId: employee,
          evaluatorId: supervisor,
          stage: "setup",
          createdAt: 10 + i,
        });
      }
    });
    for (const role of ["hr", "employee"] as const) {
      const rows = await t.query(api.print.queries.listPrintable, {
        actor: actor(role),
      });
      expect(rows).toHaveLength(MAX_LISTED);
    }
  });
});
