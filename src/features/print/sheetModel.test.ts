import { describe, expect, it } from "vitest";
import { fixtureSheet } from "./fixtures";
import { buildSheetModel, formatDate, SheetNotChosenError } from "./sheetModel";

describe("buildSheetModel", () => {
  it("gives sheet A six mandatory criteria, no unit and an objection addressee field", () => {
    const model = buildSheetModel(fixtureSheet("A"));
    expect(model.mandatory.map((row) => row.name)).toEqual([
      "Zarządzanie ludźmi",
      "Podejmowanie decyzji i odpowiedzialność",
      "Organizacja pracy i orientacja na osiąganie celów",
      "Współpraca",
      "Komunikacja",
      "Zarządzanie strategiczne",
    ]);
    expect(model.showUnit).toBe(false);
    expect(model.objection).toEqual({
      addressee: "Prezesa Rady Ministrów",
      fixedAddressee: null,
    });
  });

  it.each(["B", "C"] as const)(
    "gives sheet %s five mandatory criteria, the unit and the fixed objection text",
    (sheet) => {
      const model = buildSheetModel(fixtureSheet(sheet));
      expect(model.mandatory).toHaveLength(5);
      expect(model.showUnit).toBe(true);
      expect(model.objection).toEqual({
        addressee: null,
        fixedAddressee: "dyrektora generalnego urzędu",
      });
    },
  );

  it("marks the chosen rating of each criterion and keeps the additional ones apart", () => {
    const model = buildSheetModel(fixtureSheet("C"));
    expect(model.mandatory[0]).toMatchObject({
      id: "wykorzystywanie_wiedzy",
      levelId: "7",
      points: 7,
      levelLabel: "powyżej oczekiwań",
    });
    expect(model.additional).toEqual([
      expect.objectContaining({
        id: "kreatywnosc",
        name: "Kreatywność",
        kind: "additional",
        justification: "Proponuje nowe rozwiązania.",
      }),
    ]);
    expect(model.scale.map((level) => level.points)).toEqual([1, 3, 5, 7, 9]);
  });

  it.each([
    [2, 0],
    [2.01, 1],
    [4, 1],
    [4.5, 2],
    [6, 2],
    [6.5, 3],
    [8, 3],
    [8.01, 4],
    [9, 4],
  ])("derives the overall level from the mean %s (row %s)", (average, row) => {
    const model = buildSheetModel(
      fixtureSheet("C", { averageScore: average, overallLevelId: null }),
    );
    expect(model.levels.map((level) => level.selected)).toEqual(
      [0, 1, 2, 3, 4].map((index) => index === row),
    );
  });

  it("describes the mean ranges like the form does", () => {
    const model = buildSheetModel(fixtureSheet("C"));
    expect(model.levels.map((level) => level.range)).toEqual([
      "do 2 punktów",
      "powyżej 2 punktów do 4 punktów",
      "powyżej 4 punktów do 6 punktów",
      "powyżej 6 punktów do 8 punktów",
      "powyżej 8 punktów do 9 punktów",
    ]);
  });

  it("prefers the stored overall level over the mean", () => {
    const model = buildSheetModel(
      fixtureSheet("C", {
        averageScore: 9,
        overallLevelId: "ponizej_oczekiwan",
      }),
    );
    expect(model.overallLevelId).toBe("ponizej_oczekiwan");
  });

  it("marks no level when nothing is evaluated yet", () => {
    const model = buildSheetModel(
      fixtureSheet("C", {
        averageScore: null,
        overallLevelId: null,
        overallResult: null,
        ratings: [],
      }),
    );
    expect(model.levels.some((level) => level.selected)).toBe(false);
    expect(model.mandatory.every((row) => row.levelId === null)).toBe(true);
    expect(model.result).toBeNull();
  });

  it("falls back to ids and no mark for unknown criteria and levels", () => {
    const model = buildSheetModel(
      fixtureSheet("C", {
        additionalCriteria: ["nieznane"],
        ratings: [
          { criterionId: "nieznane", levelId: "42", justification: null },
        ],
      }),
    );
    expect(model.additional[0]).toMatchObject({
      name: "nieznane",
      levelId: null,
      points: null,
    });
  });

  it("shows the previous review and part III only for an official", () => {
    const official = buildSheetModel(fixtureSheet("C"));
    expect(official.previousReview).toEqual({
      result: "positive",
      levelLabel: "powyżej oczekiwań",
      date: "2024-11-20",
    });
    expect(official.promotionAttached).toBe("yes");
    expect(official.promotion).toMatchObject({
      appointmentYear: 2019,
      currentGrade: 3,
      nextGrade: 4,
    });

    const sheet = fixtureSheet("C");
    const employee = buildSheetModel({
      ...sheet,
      employee: { ...sheet.employee, isOfficial: false },
    });
    expect(employee.previousReview).toBeNull();
    expect(employee.promotion).toBeNull();
    expect(employee.promotionAttached).toBe("not_applicable");
  });

  it("answers NIE when an official has no promotion request", () => {
    const withoutRequest = buildSheetModel(
      fixtureSheet("C", {
        promotionRequest: {
          ...fixtureSheet("C").promotionRequest!,
          requested: false,
        },
      }),
    );
    expect(withoutRequest.promotionAttached).toBe("no");
    expect(withoutRequest.promotion).toBeNull();
  });

  it("has no next grade above the ninth", () => {
    const base = fixtureSheet("C").promotionRequest!;
    const model = buildSheetModel(
      fixtureSheet("C", { promotionRequest: { ...base, currentGrade: 9 } }),
    );
    expect(model.promotion?.nextGrade).toBeNull();
  });

  it("splits the signatures by part and treats a missing scope as the assessment", () => {
    const model = buildSheetModel(
      fixtureSheet("C", {
        signatures: [
          {
            role: "evaluator",
            scope: null,
            place: "Gdańsk",
            date: "2026-11-19",
            remarks: null,
            deemedAcknowledgement: false,
          },
          {
            role: "employee",
            scope: "part_one",
            place: null,
            date: "2024-12-03",
            remarks: null,
            deemedAcknowledgement: true,
          },
        ],
      }),
    );
    expect(model.signatures.assessment.evaluator).toEqual({
      place: "Gdańsk",
      date: "2026-11-19",
    });
    expect(model.signatures.partOne.employee).toEqual({
      place: "",
      date: "2024-12-03",
    });
    expect(model.signatures.partOne.evaluator).toBeNull();
    expect(model.signatures.assessment.employee).toBeNull();
    expect(model.signatures.assessment.deemedAcknowledgement).toBe(true);
  });

  it("flattens the development plan to the lines printed on the form", () => {
    const model = buildSheetModel(fixtureSheet("C"));
    expect(model.development).toEqual({
      summary: "Rozwój umiejętności analitycznych i prezentacji wyników.",
      strengths: ["Dokładność", "Współpraca z zespołem"],
      areas: ["Wystąpienia publiczne"],
      actions: ["Kurs wystąpień publicznych"],
    });
  });

  it("refuses a review that has no sheet yet", () => {
    expect(() => buildSheetModel(fixtureSheet("C", { sheet: null }))).toThrow(
      SheetNotChosenError,
    );
  });
});

describe("formatDate", () => {
  it("writes ISO dates as dd.mm.rrrr and tolerates empty values", () => {
    expect(formatDate("2026-11-21")).toBe("21.11.2026");
    expect(formatDate(null)).toBe("");
    expect(formatDate("nie-data")).toBe("nie-data");
  });
});
