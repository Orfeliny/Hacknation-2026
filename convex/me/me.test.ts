import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { SELF_NOTE_MAX_LENGTH } from "./limits";

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
  const other = candidates.find((c) => c._id !== anna._id)!;
  const start = (employeeId: Id<"employees">) =>
    t.mutation(api.reviews.mutations.start, { actor: supervisor, employeeId });
  return {
    t,
    own: await start(anna._id),
    foreign: await start(other._id),
    annaId: anna._id,
  };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const setStage = (
  t: T,
  reviewId: Id<"reviews">,
  stage: "writing" | "signing",
) =>
  t.run((ctx) =>
    ctx.db.patch(reviewId, {
      stage,
      ratings: [{ criterionId: "rzetelnosc", levelId: "4" }],
      overallResult: "positive",
      overallJustification: "Solidna praca",
      developmentPlan: { summary: "Szkolenie z komunikacji" },
    }),
  );

describe("me.queries.list / get", () => {
  it("lists only the employee's own reviews", async () => {
    const { t, own, foreign } = await setup();
    const rows = await t.query(api.me.queries.list, { actor: employee });
    expect(rows.map((r) => r._id)).toEqual([own]);
    expect(rows.map((r) => r._id)).not.toContain(foreign);
  });

  it("rejects another person's review", async () => {
    const { t, foreign } = await setup();
    await expect(
      t.query(api.me.queries.get, { actor: employee, reviewId: foreign }),
    ).rejects.toThrow("Nie masz dostępu");
  });

  it("serves the employee role only", async () => {
    const { t, own } = await setup();
    await expect(
      t.query(api.me.queries.list, { actor: supervisor }),
    ).rejects.toThrow();
    await expect(
      t.query(api.me.queries.get, { actor: hr, reviewId: own }),
    ).rejects.toThrow();
  });

  it("hides the evaluator's draft until the signing stage", async () => {
    const { t, own } = await setup();
    await setStage(t, own, "writing");
    const draft = await t.query(api.me.queries.get, {
      actor: employee,
      reviewId: own,
    });
    expect(draft.assessment).toBeNull();

    await setStage(t, own, "signing");
    const shown = await t.query(api.me.queries.get, {
      actor: employee,
      reviewId: own,
    });
    expect(shown.assessment?.overallResult).toBe("positive");
    expect(shown.assessment?.developmentPlan?.summary).toBe(
      "Szkolenie z komunikacji",
    );
  });

  it("never returns supervisor observations or HR signals", async () => {
    const { t, own, annaId } = await setup();
    const supervisorId = (await t.run((ctx) => ctx.db.get(annaId)))!
      .supervisorId!;
    await t.run(async (ctx) => {
      await ctx.db.insert("observations", {
        employeeId: annaId,
        authorId: supervisorId,
        date: "2026-03-01",
        text: "TAJNA-OBSERWACJA",
        sentiment: "development",
        createdAt: Date.now(),
      });
      await ctx.db.insert("hrSignals", {
        employeeId: annaId,
        supervisorId,
        kind: "workload",
        reason: "TAJNY-SYGNAL",
        detectedAt: Date.now(),
      });
    });
    await setStage(t, own, "signing");
    const payload = JSON.stringify([
      await t.query(api.me.queries.list, { actor: employee }),
      await t.query(api.me.queries.get, { actor: employee, reviewId: own }),
      await t.query(api.me.queries.selfNotes, { actor: employee }),
    ]);
    expect(payload).not.toContain("TAJNA-OBSERWACJA");
    expect(payload).not.toContain("TAJNY-SYGNAL");
  });
});

describe("self-notes", () => {
  it("the employee adds and reads own notes", async () => {
    const { t, own } = await setup();
    await t.mutation(api.me.mutations.addSelfNote, {
      actor: employee,
      text: "  Moja notatka  ",
      reviewId: own,
    });
    const notes = await t.query(api.me.queries.selfNotes, { actor: employee });
    expect(notes.map((n) => n.text)).toEqual(["Moja notatka"]);
  });

  it("HR can read them, the supervisor cannot", async () => {
    const { t, annaId } = await setup();
    await t.mutation(api.me.mutations.addSelfNote, {
      actor: employee,
      text: "Prywatne",
    });
    const asHr = await t.query(api.me.queries.selfNotes, {
      actor: hr,
      employeeId: annaId,
    });
    expect(asHr).toHaveLength(1);
    for (const role of ["supervisor", "director", "admin"] as const) {
      await expect(
        t.query(api.me.queries.selfNotes, {
          actor: { role },
          employeeId: annaId,
        }),
      ).rejects.toThrow("prywatne");
    }
  });

  it("validates text and review ownership", async () => {
    const { t, foreign } = await setup();
    const add = (text: string, reviewId?: Id<"reviews">) =>
      t.mutation(api.me.mutations.addSelfNote, {
        actor: employee,
        text,
        reviewId,
      });
    await expect(add("   ")).rejects.toThrow("pusta");
    await expect(add("x".repeat(SELF_NOTE_MAX_LENGTH + 1))).rejects.toThrow(
      "najwyżej",
    );
    await expect(add("ok", foreign)).rejects.toThrow("Nie masz dostępu");
    await expect(
      t.mutation(api.me.mutations.addSelfNote, {
        actor: supervisor,
        text: "ok",
      }),
    ).rejects.toThrow();
  });
});
