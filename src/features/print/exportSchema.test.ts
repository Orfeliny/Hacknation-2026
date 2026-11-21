import { describe, expect, it } from "vitest";
import { buildExport, reviewExportSchema } from "./exportSchema";
import { fixtureSheet } from "./fixtures";
import { buildSheetModel } from "./sheetModel";

const NOW = new Date("2026-11-21T12:00:00.000Z");

function exportOf(sheet: "A" | "B" | "C" = "C") {
  return buildExport(buildSheetModel(fixtureSheet(sheet)), NOW);
}

describe("reviewExportSchema", () => {
  it("accepts the export built from a review and survives a JSON round trip", () => {
    const built = exportOf("B");
    const parsed = reviewExportSchema.parse(JSON.parse(JSON.stringify(built)));
    expect(parsed).toEqual(built);
    expect(built).toMatchObject({
      schemaVersion: 1,
      exportedAt: "2026-11-21T12:00:00.000Z",
      sheet: "B",
      rulesVersion: "2016-04-23",
    });
  });

  it("lists mandatory criteria first, then the additional ones", () => {
    const built = exportOf("C");
    expect(built.criteria.map((row) => row.kind)).toEqual([
      "mandatory",
      "mandatory",
      "mandatory",
      "mandatory",
      "mandatory",
      "additional",
    ]);
    expect(built.criteria[0]).toMatchObject({ points: 7, levelId: "7" });
  });

  it("flattens the signatures with their part and role", () => {
    expect(exportOf().signatures).toEqual([
      {
        scope: "part_one",
        role: "evaluator",
        place: "Warszawa",
        date: "2024-12-02",
      },
      {
        scope: "part_one",
        role: "employee",
        place: "Warszawa",
        date: "2024-12-03",
      },
      {
        scope: "assessment",
        role: "evaluator",
        place: "Warszawa",
        date: "2026-11-19",
      },
      {
        scope: "assessment",
        role: "employee",
        place: "Warszawa",
        date: "2026-11-20",
      },
    ]);
  });

  it("rejects a missing or wrong schemaVersion", () => {
    const rest: Partial<ReturnType<typeof exportOf>> = { ...exportOf() };
    delete rest.schemaVersion;
    expect(reviewExportSchema.safeParse(rest).success).toBe(false);
    expect(
      reviewExportSchema.safeParse({ ...exportOf(), schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it("rejects an unknown sheet and a malformed date", () => {
    expect(
      reviewExportSchema.safeParse({ ...exportOf(), sheet: "D" }).success,
    ).toBe(false);
    expect(
      reviewExportSchema.safeParse({ ...exportOf(), dueDate: "1.12.2026" })
        .success,
    ).toBe(false);
  });
});
