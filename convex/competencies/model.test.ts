import { describe, expect, it } from "vitest";
import { RULES_2016 } from "../rules/pack2016";
import { COMPETENCY_MODEL, findCompetency, loadModel } from "./model";
import { MODEL_DATA } from "./modelData";
import { assessmentView, modelSummary, suggestionFor } from "./view";

type RawModel = {
  modelVersion: string;
  source: string;
  levels: { id: string; label: string }[];
  suggestion: { anchorLevelId: string };
  competencies: {
    id: string;
    criterionId?: string;
    indicators: { id: string; text: string; levels: Record<string, string> }[];
  }[];
};

const raw = () => structuredClone(MODEL_DATA) as RawModel;

describe("bundled model", () => {
  it("is demo data and says so", () => {
    expect(COMPETENCY_MODEL.source).toBe("demo");
    expect(modelSummary().isDemo).toBe(true);
    expect(COMPETENCY_MODEL.sourceNote).toMatch(/demonstracyjne/);
  });

  it("quotes the 14 criteria and their indicators from annex 1 word for word", () => {
    expect(
      COMPETENCY_MODEL.competencies.map((c) => ({
        id: c.criterionId,
        name: c.name,
        indicators: c.indicators.map((i) => i.text),
      })),
    ).toEqual(RULES_2016.catalog);
  });

  it("uses the five levels of the § 11 partial scale, so a final level is a rating level id", () => {
    expect(COMPETENCY_MODEL.levels).toEqual(
      RULES_2016.partialScale.map(({ id, label }) => ({ id, label })),
    );
  });
});

describe("loadModel", () => {
  it.each([
    [
      "a level without a description",
      (m: RawModel) => delete m.competencies[0].indicators[0].levels["5"],
      /komunikacja-1: missing levels \[5\]/,
    ],
    [
      "a description of an unknown level",
      (m: RawModel) => (m.competencies[0].indicators[0].levels["4"] = "x"),
      /unknown levels \[4\]/,
    ],
    [
      "an empty description",
      (m: RawModel) => (m.competencies[0].indicators[0].levels["5"] = " "),
      /levels/,
    ],
    [
      "an anchor outside the levels",
      (m: RawModel) => (m.suggestion.anchorLevelId = "6"),
      /Unknown anchor level: 6/,
    ],
    [
      "a duplicate indicator id",
      (m: RawModel) => (m.competencies[1].indicators[0].id = "komunikacja-1"),
      /Duplicate indicator ids: komunikacja-1/,
    ],
    [
      "a duplicate level id",
      (m: RawModel) => (m.levels[1].id = "1"),
      /Duplicate level ids: 1/,
    ],
    [
      "a criterion outside annex 1",
      (m: RawModel) => (m.competencies[0].criterionId = "empatia"),
      /unknown criterion empatia/,
    ],
    ["an unknown source", (m: RawModel) => (m.source = "internet"), /source/],
  ])("rejects %s", (_, mutate, message) => {
    const model = raw();
    mutate(model);
    expect(() => loadModel(model)).toThrow(message);
  });
});

describe("replacing the model is a data change", () => {
  it("picks up a new description, a new level scale and a new version without code changes", () => {
    const replacement = raw();
    replacement.modelVersion = "organizer-2027";
    replacement.source = "official";
    replacement.levels = [
      { id: "A", label: "rozwojowy" },
      { id: "B", label: "biegły" },
      { id: "C", label: "ekspercki" },
    ];
    replacement.suggestion.anchorLevelId = "B";
    for (const competency of replacement.competencies) {
      for (const indicator of competency.indicators) {
        indicator.levels = { A: "rzadko", B: "regularnie", C: "wzorcowo" };
      }
    }
    replacement.competencies[0].indicators[0].levels.B =
      "Słucha i dopytuje (opis organizatora).";

    const model = loadModel(replacement);
    const competency = findCompetency("komunikacja", model)!;
    expect(competency.indicators[0].levels.B).toBe(
      "Słucha i dopytuje (opis organizatora).",
    );
    expect(modelSummary(model)).toMatchObject({
      modelVersion: "organizer-2027",
      isDemo: false,
    });
    expect(modelSummary(model).rule.join(" ")).toMatch(/„biegły”/);

    const choices = [
      { indicatorId: "komunikacja-1", levelId: "A" },
      { indicatorId: "komunikacja-2", levelId: "C" },
    ];
    expect(suggestionFor(competency, choices, model).levelId).toBe("B");
  });

  it("ignores choices of an older model version and reports the row as outdated", () => {
    const model = loadModel({ ...raw(), modelVersion: "next" });
    const view = assessmentView(
      {
        _id: "a" as never,
        _creationTime: 0,
        employeeId: "e" as never,
        assessorId: "s" as never,
        competencyId: "rzetelnosc",
        criterionId: "rzetelnosc",
        modelVersion: "demo-old",
        createdAt: 0,
        indicatorChoices: [
          { indicatorId: "rzetelnosc-1", levelId: "7" },
          { indicatorId: "rzetelnosc-old", levelId: "9" },
          { indicatorId: "rzetelnosc-2", levelId: "B" },
        ],
      },
      "assessor",
      model,
    );
    expect(view.modelOutdated).toBe(true);
    expect(view.suggestion?.observed).toBe(1);
    expect(view.suggestedLevel).toBe("7");
  });
});
