import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { MAX_OBJECTION_LENGTH } from "./limits";
import {
  acknowledgedAt,
  canFile,
  decisionDeadline,
  filingDeadline,
} from "./rules";

const modules = import.meta.glob("/convex/**/*.*s");

type Role = "supervisor" | "employee" | "hr" | "director" | "admin";
const as = (role: Role) => ({ role });

const MANDATORY_C = [
  "wykorzystywanie_wiedzy",
  "rzetelnosc",
  "organizacja_pracy",
  "wspolpraca",
  "komunikacja",
];

const newDb = () => convexTest(schema, modules);
type T = ReturnType<typeof newDb>;

const save = (t: T, reviewId: Id<"reviews">, patch: object) =>
  t.mutation(api.reviews.mutations.save, {
    actor: as("supervisor"),
    reviewId,
    patch,
  });
const advance = (t: T, reviewId: Id<"reviews">) =>
  t.mutation(api.reviews.mutations.advance, {
    actor: as("supervisor"),
    reviewId,
  });
const sign = (
  t: T,
  reviewId: Id<"reviews">,
  role: Role,
  scope: "part_one" | "assessment",
) =>
  t.mutation(api.reviews.mutations.sign, {
    actor: as(role),
    reviewId,
    scope,
    place: "Warszawa",
  });
const reviewOf = (t: T, reviewId: Id<"reviews">) =>
  t.run((ctx) => ctx.db.get(reviewId));
const file = (
  t: T,
  reviewId: Id<"reviews">,
  text = "Nie zgadzam się z oceną.",
) =>
  t.mutation(api.objections.mutations.file, {
    actor: as("employee"),
    reviewId,
    text,
  });
const decide = (
  t: T,
  reviewId: Id<"reviews">,
  decision: "amend" | "redo" | "rejected",
  role: Role = "director",
  justification = "Uzasadnienie rozstrzygnięcia.",
) =>
  t.mutation(api.objections.mutations.decide, {
    actor: as(role),
    reviewId,
    decision,
    justification,
  });
const info = (t: T, reviewId: Id<"reviews">, role: Role = "employee") =>
  t.query(api.objections.queries.forReview, { actor: as(role), reviewId });

// A signed review in `objection_window`, as the wizard leaves it.
async function setup() {
  const t = newDb();
  await t.mutation(internal.employees.seed.run, {});
  const candidates = await t.query(api.reviews.queries.candidates, {
    actor: as("supervisor"),
  });
  const anna = candidates.find((c) => c.name.startsWith("Anna"))!;
  const reviewId = await t.mutation(api.reviews.mutations.start, {
    actor: as("supervisor"),
    employeeId: anna._id,
  });
  await save(t, reviewId, {
    openingConversationDate: "2026-01-12",
    expectations: MANDATORY_C.map((criterionId) => ({
      criterionId,
      text: "Oczekiwanie",
    })),
  });
  await sign(t, reviewId, "supervisor", "part_one");
  await sign(t, reviewId, "employee", "part_one");
  await advance(t, reviewId);
  await save(t, reviewId, {
    periodStart: "2026-01-12",
    periodEnd: "2026-11-01",
  });
  await advance(t, reviewId);
  await save(t, reviewId, { evaluationConversationDate: "2026-11-05" });
  await advance(t, reviewId);
  await save(t, reviewId, {
    ratings: MANDATORY_C.map((criterionId) => ({ criterionId, levelId: "7" })),
    developmentPlan: { summary: "Szkolenie z analizy danych." },
  });
  await advance(t, reviewId);
  await sign(t, reviewId, "supervisor", "assessment");
  await sign(t, reviewId, "employee", "assessment");
  return { t, reviewId };
}

// Redo and amend send the review back; this walks it to the signatures again.
async function resign(t: T, reviewId: Id<"reviews">) {
  const stage = (await reviewOf(t, reviewId))!.stage;
  if (stage === "evaluation") await advance(t, reviewId);
  await advance(t, reviewId);
  await sign(t, reviewId, "supervisor", "assessment");
  await sign(t, reviewId, "employee", "assessment");
}

afterEach(() => {
  vi.useRealTimers();
});

describe("objection rules", () => {
  const signed = (signedAt: number) => ({
    stage: "objection_window" as const,
    signatures: [
      {
        role: "employee" as const,
        signerId: "e" as Id<"employees">,
        signedAt,
        scope: "assessment" as const,
      },
    ],
  });

  it("takes the acknowledgement day from the employee's assessment signature", () => {
    const at = Date.UTC(2026, 10, 2, 12);
    expect(acknowledgedAt(signed(at))).toBe("2026-11-02");
    expect(acknowledgedAt({ signatures: [] })).toBeUndefined();
  });

  it("gives 7 days to file and 14 days to decide", () => {
    expect(filingDeadline("2026-11-02")).toBe("2026-11-09");
    expect(decisionDeadline(Date.UTC(2026, 10, 2, 12))).toBe("2026-11-16");
  });

  it("allows filing on the last day and refuses it a day later", () => {
    const review = signed(Date.UTC(2026, 10, 2, 12));
    expect(canFile(review, "2026-11-09")).toEqual({ allowed: true });
    const late = canFile(review, "2026-11-10");
    expect(late.allowed).toBe(false);
    expect(late.allowed ? "" : late.reason).toContain("2026-11-09");
  });

  it("refuses filing outside the objection window and after a settled objection", () => {
    const review = signed(Date.UTC(2026, 10, 2, 12));
    expect(canFile({ ...review, stage: "signing" }, "2026-11-03").allowed).toBe(
      false,
    );
    const settled = {
      ...review,
      objection: { filedAt: 1, text: "x", decision: "amend" as const },
    };
    expect(canFile(settled, "2026-11-03").allowed).toBe(false);
    const redone = {
      ...review,
      objection: { filedAt: 1, text: "x", decision: "redo" as const },
    };
    expect(canFile(redone, "2026-11-03").allowed).toBe(true);
  });
});

describe("filing an objection", () => {
  it("moves the review to the objection stage and stores text and addressee", async () => {
    const { t, reviewId } = await setup();
    const before = await info(t, reviewId);
    expect(before?.can.file).toBe(true);
    await file(t, reviewId, "  Ocena pomija moje wyniki.  ");
    const review = await reviewOf(t, reviewId);
    expect(review?.stage).toBe("objection");
    expect(review?.objection).toMatchObject({
      text: "Ocena pomija moje wyniki.",
      addressee: "Ewa Kowalczyk",
    });
    expect((await info(t, reviewId))?.can.file).toBe(false);
  });

  it("refuses an objection after the 7-day term", async () => {
    const { t, reviewId } = await setup();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const blocked = await info(t, reviewId);
    expect(blocked?.can.file).toBe(false);
    expect(blocked?.can.fileBlockedReason).toMatch(/Minął termin 7 dni/);
    await expect(file(t, reviewId)).rejects.toThrow(/Minął termin 7 dni/);
    expect((await reviewOf(t, reviewId))?.stage).toBe("objection_window");
  });

  it("refuses empty or too long text, other roles and a wrong stage", async () => {
    const { t, reviewId } = await setup();
    await expect(file(t, reviewId, "   ")).rejects.toThrow(
      /uzasadnienie sprzeciwu/,
    );
    await expect(
      file(t, reviewId, "x".repeat(MAX_OBJECTION_LENGTH + 1)),
    ).rejects.toThrow(/najwyżej/);
    for (const role of ["supervisor", "hr", "director", "admin"] as const) {
      await expect(
        t.mutation(api.objections.mutations.file, {
          actor: as(role),
          reviewId,
          text: "Sprzeciw",
        }),
      ).rejects.toThrow(/tylko oceniany/);
    }
    await file(t, reviewId);
    await expect(file(t, reviewId)).rejects.toThrow(
      /po zapoznaniu się z oceną/,
    );
  });

  it("notifies the director", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId);
    const mail = await t.run((ctx) => ctx.db.query("mailMessages").collect());
    const notice = mail.filter((m) => m.kind === "objection");
    expect(notice).toHaveLength(1);
    expect(notice[0]?.subject).toMatch(/sprzeciw/i);
    expect(notice[0]?.body).not.toContain("Nie zgadzam się");
  });
});

describe("the director's list", () => {
  it("shows only reviews with an objection", async () => {
    const { t, reviewId } = await setup();
    expect(
      await t.query(api.objections.queries.listForDirector, {
        actor: as("director"),
      }),
    ).toEqual([]);
    await file(t, reviewId, "Proszę o ponowną ocenę.");
    const rows = await t.query(api.objections.queries.listForDirector, {
      actor: as("director"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reviewId,
      employeeName: "Anna Przykładowa",
      text: "Proszę o ponowną ocenę.",
      overdue: false,
    });
    expect(rows[0]?.decisionDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is open to HR and admin and closed to supervisor and employee", async () => {
    const { t } = await setup();
    for (const role of ["hr", "admin"] as const) {
      await expect(
        t.query(api.objections.queries.listForDirector, { actor: as(role) }),
      ).resolves.toEqual([]);
    }
    for (const role of ["supervisor", "employee"] as const) {
      await expect(
        t.query(api.objections.queries.listForDirector, { actor: as(role) }),
      ).rejects.toThrow(/dyrektora generalnego/);
    }
  });

  it("marks an objection decided after 14 days as overdue", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const rows = await t.query(api.objections.queries.listForDirector, {
      actor: as("director"),
    });
    expect(rows[0]?.overdue).toBe(true);
  });
});

describe("the director's decision", () => {
  it("only the director decides, and only an open objection", async () => {
    const { t, reviewId } = await setup();
    await expect(decide(t, reviewId, "rejected")).rejects.toThrow(
      /nie ma sprzeciwu/,
    );
    await file(t, reviewId);
    for (const role of ["supervisor", "employee", "hr", "admin"] as const) {
      await expect(decide(t, reviewId, "rejected", role)).rejects.toThrow(
        /tylko dyrektor generalny/,
      );
    }
    expect((await info(t, reviewId, "director"))?.can.decide).toBe(true);
    expect((await info(t, reviewId, "supervisor"))?.can.decide).toBe(false);
  });

  it("closes the review on a rejected objection and tells about the court appeal", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId);
    await decide(t, reviewId, "rejected");
    const review = await reviewOf(t, reviewId);
    expect(review?.stage).toBe("closed");
    expect(review?.endReason).toBe("completed");
    expect(review?.closedAt).toBeTypeOf("number");
    expect(review?.objection?.decision).toBe("rejected");
    const seen = await info(t, reviewId);
    expect(seen?.courtAppealDays).toBe(14);
    expect(seen?.can.file).toBe(false);
    await expect(decide(t, reviewId, "amend")).rejects.toThrow(
      /nie ma sprzeciwu/,
    );
  });

  it("sends an upheld redo back to the evaluation with round 2 and allows a new objection", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId, "Pierwszy sprzeciw.");
    await decide(t, reviewId, "redo");
    const redone = await reviewOf(t, reviewId);
    expect(redone?.stage).toBe("evaluation");
    expect(redone?.round).toBe(2);
    expect((redone?.signatures ?? []).map((s) => s.scope)).toEqual([
      "part_one",
      "part_one",
    ]);

    await resign(t, reviewId);
    expect((await reviewOf(t, reviewId))?.stage).toBe("objection_window");
    expect((await info(t, reviewId))?.can.file).toBe(true);
    await file(t, reviewId, "Drugi sprzeciw.");
    const again = await reviewOf(t, reviewId);
    expect(again?.stage).toBe("objection");
    expect(again?.objection?.text).toBe("Drugi sprzeciw.");
    expect(again?.objection?.decision).toBeUndefined();
  });

  it("sends an upheld amend back to the writing and allows no further objection", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId);
    await decide(t, reviewId, "amend");
    const amended = await reviewOf(t, reviewId);
    expect(amended?.stage).toBe("writing");
    expect(amended?.round).toBeUndefined();

    await resign(t, reviewId);
    expect((await reviewOf(t, reviewId))?.stage).toBe("objection_window");
    const seen = await info(t, reviewId);
    expect(seen?.can.file).toBe(false);
    expect(seen?.can.fileBlockedReason).toMatch(/już rozpatrzony/);
    await expect(file(t, reviewId)).rejects.toThrow(/już rozpatrzony/);
  });

  it("notifies the employee and records the decision in the audit log", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId);
    await decide(t, reviewId, "rejected");
    const mail = await t.run((ctx) => ctx.db.query("mailMessages").collect());
    const toEmployee = mail.filter(
      (m) => m.kind === "objection" && m.subject.startsWith("Rozstrzygnięcie"),
    );
    expect(toEmployee).toHaveLength(1);
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit.some((a) => a.details?.startsWith("objection:rejected"))).toBe(
      true,
    );
    expect(JSON.stringify(audit)).not.toContain("Nie zgadzam się");
  });
});

describe("reading the objection", () => {
  it("is visible to the people who see the review and hidden from others", async () => {
    const { t, reviewId } = await setup();
    await file(t, reviewId);
    for (const role of [
      "employee",
      "supervisor",
      "hr",
      "director",
      "admin",
    ] as const) {
      expect((await info(t, reviewId, role))?.objection?.text).toBe(
        "Nie zgadzam się z oceną.",
      );
    }
  });
});
