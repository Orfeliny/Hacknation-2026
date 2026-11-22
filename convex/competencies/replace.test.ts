import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

// The backend reads only modelData.ts, so swapping that data must change what the API serves.
vi.mock("./modelData", async (importOriginal) => {
  const { MODEL_DATA } = await importOriginal<typeof import("./modelData")>();
  const data = structuredClone(MODEL_DATA) as {
    modelVersion: string;
    source: string;
    levels: { id: string; label: string }[];
    suggestion: { anchorLevelId: string };
    competencies: { indicators: { levels: Record<string, string> }[] }[];
  };
  data.modelVersion = "organizer-test";
  data.source = "official";
  data.levels = [
    { id: "A", label: "rozwojowy" },
    { id: "B", label: "biegły" },
    { id: "C", label: "ekspercki" },
  ];
  data.suggestion.anchorLevelId = "B";
  for (const competency of data.competencies) {
    for (const indicator of competency.indicators) {
      indicator.levels = { A: "rzadko", B: "regularnie", C: "wzorcowo" };
    }
  }
  return { MODEL_DATA: data };
});

const modules = import.meta.glob("/convex/**/*.*s");

describe("a replaced model", () => {
  it("is served and used by the backend without code changes", async () => {
    const t = convexTest(schema, modules);
    const model = await t.query(api.competencies.queries.model, {});
    expect(model).toMatchObject({
      modelVersion: "organizer-test",
      isDemo: false,
    });
    expect(model.competencies[0].indicators[0].levels).toEqual({
      A: "rzadko",
      B: "regularnie",
      C: "wzorcowo",
    });

    await t.mutation(internal.employees.seed.run, {});
    const anna = await t.run(
      async (ctx) =>
        (await ctx.db
          .query("employees")
          .withIndex("by_seedKey", (q) => q.eq("seedKey", "anna"))
          .unique())!._id,
    );
    const assessmentId = await t.mutation(api.competencies.mutations.open, {
      actor: { role: "supervisor" },
      employeeId: anna,
      competencyId: "rzetelnosc",
    });
    const saved = await t.mutation(api.competencies.mutations.saveChoices, {
      actor: { role: "supervisor" },
      assessmentId,
      choices: [
        { indicatorId: "rzetelnosc-1", levelId: "B" },
        { indicatorId: "rzetelnosc-2", levelId: "C" },
      ],
    });
    expect(saved.suggestion.levelId).toBe("B");
    const row = await t.run((ctx) => ctx.db.get(assessmentId));
    expect(row).toMatchObject({
      modelVersion: "organizer-test",
      suggestedLevel: "B",
    });
  });
});
