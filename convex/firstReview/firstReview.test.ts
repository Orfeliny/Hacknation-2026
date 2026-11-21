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
  const [michal] = await t.query(api.firstReview.queries.candidates, {
    actor: supervisor,
  });
  const id = await t.mutation(api.firstReview.mutations.start, {
    actor: supervisor,
    employeeId: michal._id,
  });
  return { t, id, michal };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const get = (
  t: T,
  id: Id<"firstReviews">,
  actor: { role: "supervisor" | "employee" | "hr" } = supervisor,
) => t.query(api.firstReview.queries.get, { actor, firstReviewId: id });

async function toSigning(t: T, id: Id<"firstReviews">) {
  await t.mutation(api.firstReview.mutations.confirmReport, {
    actor: supervisor,
    firstReviewId: id,
    reportReceived: true,
  });
  await t.mutation(api.firstReview.mutations.conclude, {
    actor: supervisor,
    firstReviewId: id,
    result: "positive",
    unitHeadAgreed: true,
  });
}

describe("first review", () => {
  it("offers only the new employee flagged in the demo data", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.employees.seed.run, {});
    const list = await t.query(api.firstReview.queries.candidates, {
      actor: supervisor,
    });
    expect(list.map((c) => c.name)).toEqual(["Michał Wójcik"]);
    expect(
      await t.query(api.firstReview.queries.candidates, { actor: employee }),
    ).toEqual([]);
  });

  it("starts at the report stage with the window from the rules data", async () => {
    const { t, id } = await setup();
    const view = await get(t, id);
    expect(view?.stage).toBe("report");
    expect(view?.window?.earliest).toBe("2027-05-01");
    expect(view?.window?.source).toContain("art. 38 ust. 1");
    expect(view?.warning).toContain("najwcześniej");
    expect(view?.elements.map((e) => e.id)).toEqual(["report", "unit_head"]);
  });

  it("does not start a second review while one is open", async () => {
    const { t, michal } = await setup();
    await expect(
      t.mutation(api.firstReview.mutations.start, {
        actor: supervisor,
        employeeId: michal._id,
      }),
    ).rejects.toThrow("Nie można rozpocząć");
  });

  it("goes from start to the employee's signature on demo data", async () => {
    const { t, id } = await setup();
    await toSigning(t, id);
    expect((await get(t, id))?.result).toBe("positive");
    await t.mutation(api.firstReview.mutations.sign, {
      actor: supervisor,
      firstReviewId: id,
      role: "evaluator",
      place: "Warszawa",
    });
    await t.mutation(api.firstReview.mutations.sign, {
      actor: hr,
      firstReviewId: id,
      role: "employee",
      place: "Warszawa",
    });
    const view = await get(t, id);
    expect(view?.stage).toBe("closed");
    expect(view?.effect?.source).toContain("art. 38 ust. 3 pkt 1");
    expect(view?.signatures.map((s) => [s.role, s.onBehalf])).toEqual([
      ["evaluator", false],
      ["employee", true],
    ]);
  });

  it("requires the confirmations before moving on", async () => {
    const { t, id } = await setup();
    await expect(
      t.mutation(api.firstReview.mutations.confirmReport, {
        actor: supervisor,
        firstReviewId: id,
        reportReceived: false,
      }),
    ).rejects.toThrow("sprawozdanie");
    await t.mutation(api.firstReview.mutations.confirmReport, {
      actor: supervisor,
      firstReviewId: id,
      reportReceived: true,
    });
    await expect(
      t.mutation(api.firstReview.mutations.conclude, {
        actor: supervisor,
        firstReviewId: id,
        result: "negative",
        unitHeadAgreed: false,
      }),
    ).rejects.toThrow("porozumieniu");
  });

  it("keeps the order of signatures and the stages", async () => {
    const { t, id } = await setup();
    await expect(
      t.mutation(api.firstReview.mutations.sign, {
        actor: supervisor,
        firstReviewId: id,
        role: "evaluator",
        place: "Warszawa",
      }),
    ).rejects.toThrow("etapie");
    await toSigning(t, id);
    await expect(
      t.mutation(api.firstReview.mutations.sign, {
        actor: hr,
        firstReviewId: id,
        role: "employee",
        place: "Warszawa",
      }),
    ).rejects.toThrow("po oceniającym");
    await expect(
      t.mutation(api.firstReview.mutations.sign, {
        actor: employee,
        firstReviewId: id,
        role: "employee",
        place: "Warszawa",
      }),
    ).rejects.toThrow();
  });

  it("hides the review from an unrelated employee", async () => {
    const { t, id } = await setup();
    expect(await get(t, id, employee)).toBeNull();
    expect(
      await t.query(api.firstReview.queries.list, { actor: employee }),
    ).toEqual([]);
    expect(
      await t.query(api.firstReview.queries.list, { actor: hr }),
    ).toHaveLength(1);
  });
});
