import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { RULES_2016 } from "./rules/pack2016";
import schema from "./schema";

const modules = import.meta.glob("/convex/**/*.*s");

const V1_OPTION_DESCRIPTION =
  "Proponowana aktywność rozwojowa z praktycznymi ćwiczeniami i możliwością wykorzystania wiedzy w codziennej pracy.";

type T = TestConvex<typeof schema>;

async function withPersonas() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  return t;
}

const byKey = (t: T, seedKey: string) =>
  t.run(async (ctx) => {
    const row = await ctx.db
      .query("employees")
      .withIndex("by_seedKey", (q) => q.eq("seedKey", seedKey))
      .unique();
    if (!row) throw new Error(`no ${seedKey}`);
    return row._id;
  });

// Shape of what the removed V1 seed wrote: its own ten people (with duplicate personas) and rows keyed on them.
async function insertV1(t: T) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const roles = [
      "director",
      "supervisor",
      "supervisor",
      "employee",
      "employee",
      "employee",
      "employee",
      "employee",
      "employee",
      "admin",
    ] as const;
    const people: Id<"employees">[] = [];
    for (let i = 0; i < roles.length; i++) {
      people.push(
        await ctx.db.insert("employees", {
          firstName: `V1-${i + 1}`,
          lastName: "Demo",
          position: "Specjalista",
          unit: "Wydział demo",
          createdAt: now,
          demoPersona: roles[i],
          seedKey: `demo-employee-${i + 1}`,
        }),
      );
    }
    const [, v1Boss, v1Hr, v1Jan] = people as [
      Id<"employees">,
      Id<"employees">,
      Id<"employees">,
      Id<"employees">,
    ];
    const reviewId = await ctx.db.insert("reviews", {
      employeeId: v1Jan,
      evaluatorId: v1Boss,
      stage: "writing",
      createdAt: now,
    });
    await ctx.db.insert("observations", {
      employeeId: v1Jan,
      authorId: v1Boss,
      createdAt: now,
      date: "2025-01-10",
      criterionId: "komunikacja",
      sentiment: "positive",
      text: "v1",
      wellbeing: false,
    });
    await ctx.db.insert("drafts", {
      reviewId,
      createdAt: now,
      updatedAt: now,
      section: "strength",
      status: "proposed",
      text: "v1",
      observationIds: [],
      noEvidence: false,
    });
    await ctx.db.insert("mailMessages", {
      recipientId: v1Jan,
      createdAt: now,
      channel: "demo_inbox",
      kind: "reminder",
      status: "sent",
      subject: "v1",
      body: "v1",
      reviewId,
    });
    await ctx.db.insert("auditLog", {
      actorId: v1Hr,
      actorRole: "hr",
      at: now,
      action: "view",
      entity: "reviews",
      entityId: reviewId,
      reviewId,
    });
    await ctx.db.insert("aiInteractions", {
      module: "feedback_assistant",
      provider: "demo",
      model: "demo-model",
      sentPrompt: "v1",
      output: "v1",
      createdAt: now,
      actorId: v1Boss,
      employeeId: v1Jan,
      reviewId,
    });
    await ctx.db.insert("selfNotes", {
      employeeId: v1Jan,
      reviewId,
      createdAt: now,
      text: "v1",
    });
    await ctx.db.insert("hrSignals", {
      employeeId: v1Jan,
      supervisorId: v1Boss,
      detectedAt: now,
      kind: "workload",
      reason: "v1",
      status: "open",
      recommendations: [],
    });
    const thread = await ctx.db.insert("forumThreads", {
      authorId: v1Jan,
      createdAt: now,
      title: "v1",
      body: "v1",
      kind: "question",
      replyCount: 1,
    });
    await ctx.db.insert("forumReplies", {
      threadId: thread,
      authorId: v1Boss,
      createdAt: now,
      body: "v1",
    });
    for (let i = 1; i <= 2; i++) {
      await ctx.db.insert("adviceArticles", {
        title: "Dobrostan pracownika w miejscu pracy",
        slug: `demo-poradnik-${i}`,
        summary: "v1",
        topic: "dobrostan",
        source: "demo",
        published: true,
        readingMinutes: 4,
        criterionIds: [],
        sections: [],
      });
      await ctx.db.insert("developmentOptions", {
        title: "Komunikacja interpersonalna",
        description: V1_OPTION_DESCRIPTION,
        form: "szkolenie",
        level: "podstawowy",
        cost: "bezplatne",
        active: true,
        criterionIds: [],
        provider: "Centrum Rozwoju Kompetencji",
        source: "demo",
      });
    }
    await ctx.db.insert("knowledgeChunks", {
      sourceId: "demo-przewodnik",
      sourceTitle: "v1",
      locator: "sekcja-1",
      order: 1,
      text: "v1",
    });
    await ctx.db.insert("regulationWatch", {
      eliId: "demo-eli-przepis",
      title: "v1",
      checkedAt: now,
    });
    await ctx.db.insert("notes", { createdAt: now, text: "__DEMO_SEED_V1__" });
    await ctx.db.insert("notes", {
      createdAt: now,
      text: "Środowisko demo zostało zasilone przykładowymi danymi. Dane są fikcyjne.",
    });
    return { v1Boss, v1Jan, reviewId };
  });
}

const count = (t: T, table: "employees" | "reviews") =>
  t.run(async (ctx) => (await ctx.db.query(table).collect()).length);

describe("demo seed V2", () => {
  it("inserts schema-valid demo data on the personas", async () => {
    const t = await withPersonas();

    const result = await t.mutation(internal.seed.seed, {});

    expect(result.seeded).toBe(true);
    const naczelnik = await byKey(t, "naczelnik");
    const reviews = await t.run((ctx) =>
      ctx.db
        .query("reviews")
        .withIndex("by_evaluator", (q) => q.eq("evaluatorId", naczelnik))
        .collect(),
    );
    expect(new Set(reviews.map((r) => r.stage))).toEqual(
      new Set(["observation", "evaluation", "writing", "closed"]),
    );
    expect(await count(t, "employees")).toBe(12);
  });

  it("fails clearly, and writes nothing, when the personas are missing", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(internal.seed.seed, {})).rejects.toThrow(
      /employees\/seed:run/,
    );
    expect(await count(t, "reviews")).toBe(0);
  });

  it("replaces V1 rows, keeps rows of the personas and is a no-op on the second run", async () => {
    const t = await withPersonas();
    const { v1Boss } = await insertV1(t);
    const naczelnik = await byKey(t, "naczelnik");
    const anna = await byKey(t, "anna");
    const radca = await byKey(t, "radca");
    const analityk = await byKey(t, "analityk");

    const { userObservation, reassignedReview } = await t.run(async (ctx) => {
      const userObservation = await ctx.db.insert("observations", {
        employeeId: anna,
        authorId: naczelnik,
        createdAt: Date.now(),
        date: "2026-11-01",
        criterionId: "komunikacja",
        sentiment: "positive",
        text: "dodane ręcznie",
        wellbeing: false,
      });
      await ctx.db.patch(radca, { supervisorId: v1Boss });
      const reassignedReview = await ctx.db.insert("reviews", {
        employeeId: analityk,
        evaluatorId: v1Boss,
        stage: "opening",
        createdAt: Date.now(),
      });
      return { userObservation, reassignedReview };
    });

    const first = await t.mutation(internal.seed.seed, {});

    expect(first.seeded).toBe(true);
    if (!first.seeded) return;
    expect(first.danglingReferences).toEqual(
      expect.arrayContaining([
        { table: "employees", id: radca, field: "supervisorId" },
        { table: "reviews", id: reassignedReview, field: "evaluatorId" },
      ]),
    );
    expect(first.danglingReferences).toHaveLength(2);

    const state = await t.run(async (ctx) => {
      return {
        employees: await ctx.db.query("employees").collect(),
        advice: await ctx.db.query("adviceArticles").collect(),
        options: await ctx.db.query("developmentOptions").collect(),
        notes: await ctx.db.query("notes").collect(),
        chunks: await ctx.db.query("knowledgeChunks").collect(),
        watch: await ctx.db.query("regulationWatch").collect(),
        audit: await ctx.db.query("auditLog").collect(),
        threads: await ctx.db.query("forumThreads").collect(),
        replies: await ctx.db.query("forumReplies").collect(),
        kept: await ctx.db.get(userObservation),
        keptReview: await ctx.db.get(reassignedReview),
      };
    });

    expect(
      state.employees.filter((e) => e.seedKey?.startsWith("demo-employee-")),
    ).toHaveLength(0);
    const personas = state.employees
      .map((e) => e.demoPersona)
      .filter((p) => p !== undefined);
    expect(personas.toSorted()).toEqual([
      "admin",
      "director",
      "employee",
      "hr",
      "supervisor",
    ]);
    expect(state.kept?.text).toBe("dodane ręcznie");
    expect(state.keptReview?.evaluatorId).toBe(v1Boss);
    expect(state.notes.map((n) => n.text)).not.toContain("__DEMO_SEED_V1__");
    expect(state.notes).toHaveLength(0);
    expect(state.advice).toHaveLength(0);
    expect(state.options).toHaveLength(0);
    expect(state.chunks).toHaveLength(3);
    expect(state.watch).toHaveLength(1);
    expect(state.audit.every((a) => a.reviewId !== undefined)).toBe(true);
    expect(state.employees.some((e) => e.firstName.startsWith("V1-"))).toBe(
      false,
    );
    expect(state.threads).toHaveLength(0);
    expect(state.replies).toHaveLength(0);

    const reviewsBefore = await count(t, "reviews");
    const second = await t.mutation(internal.seed.seed, {});
    expect(second.seeded).toBe(false);
    expect(await count(t, "reviews")).toBe(reviewsBefore);
    expect(await count(t, "employees")).toBe(12);
  });

  it("stores ratings that match the pack, with the average computed from them", async () => {
    const t = await withPersonas();
    await t.mutation(internal.seed.seed, {});

    const reviews = await t.run((ctx) => ctx.db.query("reviews").collect());
    const rated = reviews.filter((r) => r.ratings !== undefined);
    expect(rated.length).toBeGreaterThan(0);
    const valid = new Set(RULES_2016.partialScale.map((l) => l.id));
    const known = new Set(RULES_2016.catalog.map((c) => c.id));
    for (const r of rated) {
      const ratings = r.ratings ?? [];
      expect(ratings.every((x) => valid.has(x.levelId))).toBe(true);
      expect(ratings.map((x) => x.criterionId).toSorted()).toEqual(
        [
          ...RULES_2016.sheets.C.mandatory,
          ...(r.additionalCriteria ?? []),
        ].toSorted(),
      );
      expect(r.averageScore).toBeCloseTo(
        ratings.reduce((sum, x) => sum + Number(x.levelId), 0) / ratings.length,
      );
      expect(r.additionalCriteria?.every((c) => known.has(c as never))).toBe(
        true,
      );
    }
    expect(
      reviews.filter(
        (r) => r.ratings === undefined && r.averageScore !== undefined,
      ),
    ).toHaveLength(0);
  });

  it("seeds observations whose sentiment fits the text, and no marker note", async () => {
    const t = await withPersonas();
    await t.mutation(internal.seed.seed, {});

    const observations = await t.run((ctx) =>
      ctx.db.query("observations").collect(),
    );
    for (const o of observations) {
      if (o.text.startsWith("Warto doskonalić"))
        expect(o.sentiment).toBe("development");
      if (o.text.startsWith("Samodzielnie przygotował"))
        expect(o.sentiment).toBe("positive");
    }
    const notes = await t.run((ctx) => ctx.db.query("notes").collect());
    expect(notes.some((n) => n.text.includes("__DEMO_SEED"))).toBe(false);
  });

  it("leaves no V1 rows owned by a deleted employee behind", async () => {
    const t = await withPersonas();
    const { reviewId } = await insertV1(t);

    await t.mutation(internal.seed.seed, {});

    const leftovers = await t.run(async (ctx) => {
      const deadReview = await ctx.db.get(reviewId);
      const mail = await ctx.db
        .query("mailMessages")
        .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
        .collect();
      const ai = await ctx.db
        .query("aiInteractions")
        .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
        .collect();
      const drafts = await ctx.db
        .query("drafts")
        .filter((q) => q.eq(q.field("reviewId"), reviewId))
        .collect();
      return { deadReview, mail, ai, drafts };
    });
    expect(leftovers.deadReview).toBeNull();
    expect(leftovers.mail).toHaveLength(0);
    expect(leftovers.ai).toHaveLength(0);
    expect(leftovers.drafts).toHaveLength(0);
  });
});
