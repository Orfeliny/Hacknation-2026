import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";
import { planReminders } from "./planner";
import { earnsMandatoryPromotion } from "./reminders";

const modules = import.meta.glob("/convex/**/*.*s");

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const person = (firstName: string, extra: Partial<Doc<"employees">> = {}) =>
      ctx.db.insert("employees", {
        firstName,
        lastName: "Testowa",
        position: "Specjalista",
        unit: "Wydział A",
        createdAt: 0,
        ...extra,
      });
    const boss = await person("Szefowa", {
      demoPersona: "supervisor",
      corpsRole: "official",
    });
    const hr = await person("Kadrowa", { demoPersona: "hr" });
    const anna = await person("Anna", {
      demoPersona: "employee",
      corpsRole: "official",
      supervisorId: boss,
      indefiniteEmploymentSince: "2026-10-01",
    });
    return { boss, hr, anna };
  });
  return { t, ...ids };
}

const review = (
  employeeId: Id<"employees">,
  evaluatorId: Id<"employees">,
  extra: Omit<Partial<Doc<"reviews">>, "_id" | "_creationTime"> &
    Pick<Doc<"reviews">, "stage">,
) => ({ employeeId, evaluatorId, createdAt: 0, ...extra });

describe("planReminders", () => {
  const base = {
    _id: "r" as Id<"reviews">,
    _creationTime: 0,
    employeeId: "e" as Id<"employees">,
    evaluatorId: "s" as Id<"employees">,
    createdAt: 0,
  };
  const deadlines = [
    { kind: "opening" as const, date: "2026-11-02", source: "§ 7" },
    { kind: "review" as const, date: "2028-10-02", source: "art. 81" },
  ];

  it("reminds the evaluator about the opening within 14 days and when overdue", () => {
    expect(
      planReminders({ ...base, stage: "setup" }, deadlines, "2026-10-01"),
    ).toEqual([]);
    expect(
      planReminders({ ...base, stage: "setup" }, deadlines, "2026-10-20"),
    ).toMatchObject([{ recipientId: "s", kind: "upcoming", stage: "opening" }]);
    expect(
      planReminders({ ...base, stage: "opening" }, deadlines, "2026-11-03"),
    ).toMatchObject([{ kind: "overdue" }]);
  });

  it("reminds both sides about the review due date during the period", () => {
    const plans = planReminders(
      { ...base, stage: "observation" },
      deadlines,
      "2028-09-25",
    );
    expect(plans.map((p) => [p.recipientId, p.kind, p.stage])).toEqual([
      ["s", "upcoming", "review"],
      ["e", "upcoming", "review"],
    ]);
    expect(
      planReminders({ ...base, stage: "signing" }, deadlines, "2028-10-10"),
    ).toEqual([]);
  });
});

describe("generate", () => {
  it("creates reminders once per due date and marks them delivered", async () => {
    const { t, anna, boss } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("reviews", review(anna, boss, { stage: "setup" })),
    );
    const first = await t.mutation(internal.hrDashboard.reminders.generate, {
      today: "2026-10-25",
    });
    expect(first.created).toBe(1);
    const again = await t.mutation(internal.hrDashboard.reminders.generate, {
      today: "2026-10-26",
    });
    expect(again.created).toBe(0);
    const mine = await t.query(api.hrDashboard.queries.myReminders, {
      actor: { role: "supervisor" },
    });
    expect(mine).toHaveLength(1);
    expect(mine[0]?.message).toContain("2026-11-02");
    expect(mine[0]?.sentAt).toBeDefined();
  });

  it("uses an approved due date stored on the review", async () => {
    const { t, anna, boss } = await setup();
    await t.run((ctx) =>
      ctx.db.insert(
        "reviews",
        review(anna, boss, { stage: "observation", dueDate: "2027-03-01" }),
      ),
    );
    await t.mutation(internal.hrDashboard.reminders.generate, {
      today: "2027-03-02",
    });
    const mine = await t.query(api.hrDashboard.queries.myReminders, {
      actor: { role: "employee" },
    });
    expect(mine).toMatchObject([{ kind: "overdue", dueDate: "2027-03-01" }]);
  });

  it("reminds HR about a mandatory next grade (art. 89 ust. 2)", async () => {
    const { t, anna, boss } = await setup();
    await t.run(async (ctx) => {
      for (const [closedAt, level] of [
        [Date.UTC(2024, 0, 10), "powyzej_oczekiwan"],
        [Date.UTC(2026, 0, 10), "znacznie_powyzej_oczekiwan"],
      ] as const) {
        await ctx.db.insert(
          "reviews",
          review(anna, boss, {
            stage: "closed",
            closedAt,
            overallResult: "positive",
            overallLevelId: level,
          }),
        );
      }
    });
    await t.mutation(internal.hrDashboard.reminders.generate, {
      today: "2026-01-12",
    });
    const hr = await t.query(api.hrDashboard.queries.myReminders, {
      actor: { role: "hr" },
    });
    expect(hr).toMatchObject([
      { stage: "mandatory_promotion", dueDate: "2026-02-09" },
    ]);
    expect(hr[0]?.message).toContain("art. 89 ust. 2");
  });

  it("needs two consecutive top-level positives for the mandatory grade", () => {
    const r = (closedAt: number, overallLevelId: string) =>
      ({
        closedAt,
        overallResult: "positive",
        overallLevelId,
      }) as Doc<"reviews">;
    expect(
      earnsMandatoryPromotion([
        r(1, "powyzej_oczekiwan"),
        r(2, "powyzej_oczekiwan"),
      ]),
    ).toBe(true);
    expect(
      earnsMandatoryPromotion([
        r(1, "powyzej_oczekiwan"),
        r(2, "na_poziomie_oczekiwan"),
      ]),
    ).toBe(false);
    expect(earnsMandatoryPromotion([r(2, "powyzej_oczekiwan")])).toBe(false);
  });
});

describe("feedback nudge", () => {
  it("recommends feedback after 90 quiet days, at most once a month", async () => {
    const { t, anna, boss } = await setup();
    await t.run((ctx) =>
      ctx.db.insert(
        "reviews",
        review(anna, boss, {
          stage: "observation",
          periodStart: "2026-01-05",
          dueDate: "2028-01-05",
        }),
      ),
    );
    expect(
      (
        await t.mutation(internal.hrDashboard.reminders.generate, {
          today: "2026-03-01",
        })
      ).created,
    ).toBe(0);
    expect(
      (
        await t.mutation(internal.hrDashboard.reminders.generate, {
          today: "2026-04-10",
        })
      ).created,
    ).toBe(1);
    expect(
      (
        await t.mutation(internal.hrDashboard.reminders.generate, {
          today: "2026-04-20",
        })
      ).created,
    ).toBe(0);
    const mine = await t.query(api.hrDashboard.queries.myReminders, {
      actor: { role: "supervisor" },
    });
    expect(mine).toMatchObject([{ kind: "feedback_nudge" }]);
    expect(mine[0]?.message).toMatch(/^Rekomendacja/);
  });

  it("stays quiet after a recent note by the evaluator", async () => {
    const { t, anna, boss } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert(
        "reviews",
        review(anna, boss, {
          stage: "observation",
          periodStart: "2026-01-05",
          dueDate: "2028-01-05",
        }),
      );
      await ctx.db.insert("observations", {
        employeeId: anna,
        authorId: boss,
        date: "2026-03-20",
        text: "Dobra analiza.",
        sentiment: "positive",
        createdAt: 0,
      });
    });
    expect(
      (
        await t.mutation(internal.hrDashboard.reminders.generate, {
          today: "2026-04-10",
        })
      ).created,
    ).toBe(0);
  });
});

describe("statusBoard and stats", () => {
  it("shows a supervisor own reviews with an overdue flag and an employee only theirs", async () => {
    const { t, anna, boss, hr } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert(
        "reviews",
        review(anna, boss, { stage: "observation", dueDate: "2020-01-01" }),
      );
      await ctx.db.insert(
        "reviews",
        review(boss, hr, { stage: "setup", dueDate: "2099-01-01" }),
      );
    });
    const supervisor = await t.query(api.hrDashboard.queries.statusBoard, {
      actor: { role: "supervisor" },
    });
    expect(supervisor).toMatchObject([
      { employee: "Anna Testowa", overdue: true },
    ]);
    const employee = await t.query(api.hrDashboard.queries.statusBoard, {
      actor: { role: "employee" },
    });
    expect(employee).toHaveLength(1);
    const all = await t.query(api.hrDashboard.queries.statusBoard, {
      actor: { role: "hr" },
    });
    expect(all).toHaveLength(2);
  });

  it("hides groups below the minimum size and refuses supervisors", async () => {
    const { t, anna, boss } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert(
          "reviews",
          review(anna, boss, {
            stage: "closed",
            overallLevelId: "na_poziomie_oczekiwan",
            closedAt: i,
          }),
        );
      }
      await ctx.db.insert(
        "reviews",
        review(anna, boss, {
          stage: "closed",
          overallLevelId: "powyzej_oczekiwan",
          closedAt: 9,
        }),
      );
    });
    const stats = await t.query(api.hrDashboard.queries.stats, {
      actor: { role: "director" },
    });
    expect(stats.levels).toContainEqual({
      label: "na poziomie oczekiwań",
      count: 3,
    });
    expect(stats.levels).toContainEqual({
      label: "powyżej oczekiwań",
      hidden: true,
    });
    await expect(
      t.query(api.hrDashboard.queries.stats, { actor: { role: "supervisor" } }),
    ).rejects.toThrow(/kadr/);
  });
});

describe("manual reminders", () => {
  it("lets HR nudge the evaluator and only the recipient dismiss it", async () => {
    const { t, anna, boss } = await setup();
    const reviewId = await t.run((ctx) =>
      ctx.db.insert("reviews", review(anna, boss, { stage: "opening" })),
    );
    await expect(
      t.mutation(api.hrDashboard.mutations.sendManual, {
        actor: { role: "supervisor" },
        reviewId,
        message: "x",
        dueDate: "2026-12-01",
      }),
    ).rejects.toThrow(/kadry/);
    const id = await t.mutation(api.hrDashboard.mutations.sendManual, {
      actor: { role: "hr" },
      reviewId,
      message: "Proszę o rozmowę rozpoczynającą.",
      dueDate: "2026-12-01",
    });
    await expect(
      t.mutation(api.hrDashboard.mutations.dismiss, {
        actor: { role: "hr" },
        reminderId: id,
      }),
    ).rejects.toThrow(/nie należy/);
    await t.mutation(api.hrDashboard.mutations.dismiss, {
      actor: { role: "supervisor" },
      reminderId: id,
    });
    expect(
      await t.query(api.hrDashboard.queries.myReminders, {
        actor: { role: "supervisor" },
      }),
    ).toEqual([]);
  });
});
