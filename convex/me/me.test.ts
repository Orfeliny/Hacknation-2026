import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
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
  return { t, reviewId, anna };
}

describe("me: widok pracownika", () => {
  it("returns only the employee's own reviews", async () => {
    const { t, reviewId } = await setup();

    const mine = await t.query(api.me.queries.myReviews, { actor: employee });

    expect(mine.map((r) => r._id)).toEqual([reviewId]);
  });

  it("refuses a review that belongs to someone else", async () => {
    const { t } = await setup();
    const foreign = await t.run(async (ctx) => {
      const people = await ctx.db.query("employees").collect();
      const other = people.find((p) => p.demoPersona !== "employee")!;
      return await ctx.db.insert("reviews", {
        employeeId: other._id,
        evaluatorId: other._id,
        stage: "opening",
        createdAt: 0,
      });
    });

    await expect(
      t.query(api.me.queries.myReview, { actor: employee, reviewId: foreign }),
    ).rejects.toThrow(/Tej oceny nie widzisz/);
  });

  it("does not expose observations, conversations or HR signals", async () => {
    const { t, reviewId } = await setup();

    const view = await t.query(api.me.queries.myReview, {
      actor: employee,
      reviewId,
    });

    const keys = Object.keys(view);
    for (const forbidden of [
      "observations",
      "conversations",
      "hrSignals",
      "staffingSituations",
      "deadlineChanges",
      "evaluatorId",
      "employeeId",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(view)).not.toMatch(/"remarks"/);
  });

  it("hides the assessment until the signing stage", async () => {
    const { t, reviewId } = await setup();

    const view = await t.query(api.me.queries.myReview, {
      actor: employee,
      reviewId,
    });

    expect(view.stage).toBe("opening");
    expect(view.assessment).toBeNull();
  });

  it("returns empty lists when no employee has the employee persona", async () => {
    const t = convexTest(schema, modules);

    expect(
      await t.query(api.me.queries.myReviews, { actor: employee }),
    ).toEqual([]);
    expect(await t.query(api.me.queries.myNotes, { actor: employee })).toEqual(
      [],
    );
  });

  it("refuses the view to other roles", async () => {
    const { t } = await setup();

    await expect(
      t.query(api.me.queries.myReviews, { actor: supervisor }),
    ).rejects.toThrow(/dla pracownika oceniany/);
  });

  it("saves a trimmed note and lists newest first", async () => {
    const { t } = await setup();
    await t.mutation(api.me.mutations.addNote, {
      actor: employee,
      text: "  pierwsza  ",
    });
    await t.mutation(api.me.mutations.addNote, {
      actor: employee,
      text: "druga",
    });

    const notes = await t.query(api.me.queries.myNotes, { actor: employee });

    expect(notes.map((n) => n.text)).toEqual(["druga", "pierwsza"]);
  });

  it("rejects an empty note", async () => {
    const { t } = await setup();

    await expect(
      t.mutation(api.me.mutations.addNote, { actor: employee, text: "   " }),
    ).rejects.toThrow(/1–1000 znaków/);
  });

  it("rejects a note attached to someone else's review", async () => {
    const { t } = await setup();
    const foreign = await t.run(async (ctx) => {
      const people = await ctx.db.query("employees").collect();
      const other = people.find((p) => p.demoPersona !== "employee")!;
      return await ctx.db.insert("reviews", {
        employeeId: other._id,
        evaluatorId: other._id,
        stage: "opening",
        createdAt: 0,
      });
    });

    await expect(
      t.mutation(api.me.mutations.addNote, {
        actor: employee,
        text: "notatka",
        reviewId: foreign,
      }),
    ).rejects.toThrow(/Tej oceny nie widzisz/);
  });
});
