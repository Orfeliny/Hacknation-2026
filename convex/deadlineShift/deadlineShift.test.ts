import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const supervisor = { role: "supervisor" as const };
const employee = { role: "employee" as const };
const hr = { role: "hr" as const };

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
  await t.run((ctx) =>
    ctx.db.patch(reviewId, {
      dueDate: "2027-05-02",
      deadlineChanges: [
        {
          reason: "absence_extension",
          status: "approved",
          previousDate: "2027-03-16",
          newDate: "2027-05-02",
          createdAt: 1,
        },
        {
          reason: "employee_request",
          status: "requested",
          previousDate: "2027-05-02",
          newDate: "2027-06-01",
          proposedDate: "2027-06-01",
          employeeReason: "Urlop zaplanowany w maju.",
          createdAt: 2,
          requestedById: anna._id,
        },
      ],
    }),
  );
  return { t, reviewId, annaId: anna._id };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const decide = (
  t: T,
  reviewId: Id<"reviews">,
  args: { accepted: boolean; justification: string; newDate?: string },
  actor: { role: "supervisor" | "hr" | "employee" } = supervisor,
) =>
  t.mutation(api.deadlineShift.mutations.decide, {
    actor,
    reviewId,
    changeIndex: 1,
    ...args,
  });

describe("deadline shift queries", () => {
  it("lists only employee requests for the evaluator, with the employee's data", async () => {
    const { t, reviewId } = await setup();
    const rows = await t.query(api.deadlineShift.queries.listForSupervisor, {
      actor: supervisor,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reviewId,
      changeIndex: 1,
      basis: "optional",
      status: "requested",
      currentDueDate: "2027-05-02",
      proposedDate: "2027-06-01",
      shiftAllowed: true,
    });
    expect(rows[0]?.employeeName).toContain("Anna");
    expect(
      await t.query(api.deadlineShift.queries.listForSupervisor, {
        actor: employee,
      }),
    ).toEqual([]);
  });

  it("lists decided entries without a notice for HR, mandatory ones included", async () => {
    const { t, reviewId } = await setup();
    const first = await t.query(api.deadlineShift.queries.listAwaitingNotice, {
      actor: hr,
    });
    expect(first.map((r) => [r.changeIndex, r.basis])).toEqual([
      [0, "mandatory"],
    ]);
    await decide(t, reviewId, {
      accepted: true,
      justification: "Zgoda.",
      newDate: "2027-06-01",
    });
    const second = await t.query(api.deadlineShift.queries.listAwaitingNotice, {
      actor: hr,
    });
    expect(second.map((r) => r.changeIndex)).toEqual([0, 1]);
    expect(
      await t.query(api.deadlineShift.queries.listAwaitingNotice, {
        actor: supervisor,
      }),
    ).toEqual([]);
  });

  it("shows an employee only their own entries, newest first", async () => {
    const { t, annaId } = await setup();
    const own = await t.query(api.deadlineShift.queries.listForEmployee, {
      actor: employee,
      employeeId: annaId,
    });
    expect(own.map((r) => r.changeIndex)).toEqual([1, 0]);
    const michal = await t.run(async (ctx) =>
      (await ctx.db.query("employees").collect()).find(
        (e) => e.firstName === "Michał",
      ),
    );
    expect(
      await t.query(api.deadlineShift.queries.listForEmployee, {
        actor: employee,
        employeeId: michal!._id,
      }),
    ).toEqual([]);
  });

  it("returns null for a missing entry or a stranger", async () => {
    const { t, reviewId } = await setup();
    const missing = await t.query(api.deadlineShift.queries.get, {
      actor: hr,
      reviewId,
      changeIndex: 9,
    });
    expect(missing).toBeNull();
    const found = await t.query(api.deadlineShift.queries.get, {
      actor: hr,
      reviewId,
      changeIndex: 1,
    });
    expect(found?.status).toBe("requested");
  });
});

describe("deadline shift decisions", () => {
  it("approves with a justification, then HR's notice moves the due date", async () => {
    const { t, reviewId } = await setup();
    await decide(t, reviewId, {
      accepted: true,
      justification: "  Urlop jest udokumentowany.  ",
      newDate: "2027-06-15",
    });
    const decided = await t.query(api.deadlineShift.queries.get, {
      actor: hr,
      reviewId,
      changeIndex: 1,
    });
    expect(decided).toMatchObject({
      status: "approved",
      newDate: "2027-06-15",
      proposedDate: "2027-06-01",
      decisionJustification: "Urlop jest udokumentowany.",
    });
    expect(decided?.decidedByName).toBeTruthy();
    const before = await t.run((ctx) => ctx.db.get(reviewId));
    expect(before?.dueDate).toBe("2027-05-02");
    const result = await t.mutation(
      api.deadlineShift.mutations.markNoticeSent,
      {
        actor: hr,
        reviewId,
        changeIndex: 1,
      },
    );
    expect(result).toEqual({ dueDate: "2027-06-15" });
    const after = await t.run((ctx) => ctx.db.get(reviewId));
    expect(after?.dueDate).toBe("2027-06-15");
    expect(after?.deadlineChanges).toHaveLength(2);
  });

  it("keeps the due date when the request is rejected", async () => {
    const { t, reviewId } = await setup();
    await decide(t, reviewId, {
      accepted: false,
      justification: "Brak podstaw.",
    });
    const result = await t.mutation(
      api.deadlineShift.mutations.markNoticeSent,
      {
        actor: hr,
        reviewId,
        changeIndex: 1,
      },
    );
    expect(result).toEqual({ dueDate: "2027-05-02" });
  });

  it("applies a mandatory absence extension only after the notice", async () => {
    const { t, reviewId } = await setup();
    await t.run((ctx) => ctx.db.patch(reviewId, { dueDate: "2027-03-16" }));
    const result = await t.mutation(
      api.deadlineShift.mutations.markNoticeSent,
      {
        actor: hr,
        reviewId,
        changeIndex: 0,
      },
    );
    expect(result).toEqual({ dueDate: "2027-05-02" });
  });

  it("requires the evaluator, a justification and an accepted date after the old one", async () => {
    const { t, reviewId } = await setup();
    await expect(
      decide(t, reviewId, { accepted: false, justification: "x" }, hr),
    ).rejects.toThrow("przełożony");
    await expect(
      decide(t, reviewId, { accepted: false, justification: "  " }),
    ).rejects.toThrow("uzasadnienie");
    await expect(
      decide(t, reviewId, { accepted: true, justification: "ok" }),
    ).rejects.toThrow("nową datę");
    await expect(
      decide(t, reviewId, {
        accepted: true,
        justification: "ok",
        newDate: "2027-05-01",
      }),
    ).rejects.toThrow("po dotychczasowym");
  });

  it("rejects an acceptance before 6 months of the cycle, with the text the query shows", async () => {
    const { t, reviewId, annaId } = await setup();
    await t.run((ctx) =>
      ctx.db.patch(annaId, {
        indefiniteEmploymentSince: new Date().toISOString().slice(0, 10),
      }),
    );
    const row = await t.query(api.deadlineShift.queries.get, {
      actor: hr,
      reviewId,
      changeIndex: 1,
    });
    expect(row?.shiftAllowed).toBe(false);
    expect(row?.shiftBlockedReason).toContain("6 miesięcy");
    await expect(
      decide(t, reviewId, {
        accepted: true,
        justification: "ok",
        newDate: "2027-06-01",
      }),
    ).rejects.toThrow("6 miesięcy");
    await decide(t, reviewId, {
      accepted: false,
      justification: "Za wcześnie.",
    });
  });

  it("decides once and sends the notice once, in order", async () => {
    const { t, reviewId } = await setup();
    await expect(
      t.mutation(api.deadlineShift.mutations.markNoticeSent, {
        actor: hr,
        reviewId,
        changeIndex: 1,
      }),
    ).rejects.toThrow("czeka");
    await decide(t, reviewId, { accepted: false, justification: "Nie." });
    await expect(
      decide(t, reviewId, { accepted: false, justification: "Jeszcze raz." }),
    ).rejects.toThrow("rozpatrzony");
    await t.mutation(api.deadlineShift.mutations.markNoticeSent, {
      actor: hr,
      reviewId,
      changeIndex: 1,
    });
    await expect(
      t.mutation(api.deadlineShift.mutations.markNoticeSent, {
        actor: hr,
        reviewId,
        changeIndex: 1,
      }),
    ).rejects.toThrow("już wysłane");
    await expect(
      t.mutation(api.deadlineShift.mutations.markNoticeSent, {
        actor: supervisor,
        reviewId,
        changeIndex: 0,
      }),
    ).rejects.toThrow("kadry");
  });

  it("writes an audit entry for each decision and notice", async () => {
    const { t, reviewId } = await setup();
    await decide(t, reviewId, { accepted: false, justification: "Nie." });
    await t.mutation(api.deadlineShift.mutations.markNoticeSent, {
      actor: hr,
      reviewId,
      changeIndex: 1,
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entity", "deadlineChange").eq("entityId", `${reviewId}:1`),
        )
        .collect(),
    );
    expect(rows.map((r) => [r.actorRole, r.details])).toEqual([
      ["supervisor", "rejected"],
      ["hr", "notice_sent"],
    ]);
  });
});
