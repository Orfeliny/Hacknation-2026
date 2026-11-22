import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { toFragments } from "./fragments";
import type { DraftOutput } from "./prompts";

const id = (value: string) => value as Id<"observations">;

const context = {
  ratings: [
    { criterionId: "komunikacja", points: 9 },
    { criterionId: "rzetelnosc", points: 5 },
  ],
  observations: [
    {
      label: "O1",
      id: id("obs1"),
      criterionId: "komunikacja",
      sentiment: "development" as const,
    },
    {
      label: "O2",
      id: id("obs2"),
      criterionId: "rzetelnosc",
      sentiment: "positive" as const,
    },
  ],
};

const empty: DraftOutput = {
  criteria: [],
  strengths: [],
  developmentAreas: [],
  developmentActions: [],
  feedbackTips: [],
};

describe("toFragments", () => {
  it("maps cited labels to observation ids, ignoring case and spaces", () => {
    const [fragment] = toFragments(
      {
        ...empty,
        criteria: [
          {
            criterionId: "rzetelnosc",
            text: "Tekst",
            evidence: [" o2 ", "O2"],
          },
        ],
      },
      context,
    );
    expect(fragment).toMatchObject({
      section: "criterion_justification",
      criterionId: "rzetelnosc",
      observationIds: ["obs2"],
      noEvidence: false,
    });
  });

  it("drops a label the model invented and marks the fragment as having no basis", () => {
    const [fragment] = toFragments(
      {
        ...empty,
        strengths: [{ text: "Dobra praca", evidence: ["O99", "Z1"] }],
      },
      context,
    );
    expect(fragment).toMatchObject({ observationIds: [], noEvidence: true });
  });

  it("keeps the valid labels when the model also invented one", () => {
    const [fragment] = toFragments(
      { ...empty, strengths: [{ text: "Tekst", evidence: ["O99", "O1"] }] },
      context,
    );
    expect(fragment).toMatchObject({
      observationIds: ["obs1"],
      noEvidence: false,
    });
  });

  it("stores the inconsistency found by the rules on the justification", () => {
    const fragments = toFragments(
      {
        ...empty,
        criteria: [
          {
            criterionId: "komunikacja",
            text: "Uzasadnienie",
            evidence: ["O1"],
          },
          { criterionId: "rzetelnosc", text: "Uzasadnienie", evidence: ["O2"] },
        ],
      },
      context,
    );
    expect(fragments[0]?.inconsistency).toMatch(/Wysoka ocena/);
    expect(fragments[1]?.inconsistency).toBeUndefined();
  });

  it("skips a criterion that was not rated and a repeated one", () => {
    const fragments = toFragments(
      {
        ...empty,
        criteria: [
          { criterionId: "wspolpraca", text: "Nie oceniane", evidence: [] },
          { criterionId: "komunikacja", text: "Pierwszy", evidence: [] },
          { criterionId: "komunikacja", text: "Drugi", evidence: [] },
        ],
      },
      context,
    );
    expect(fragments.map((f) => f.text)).toEqual(["Pierwszy"]);
  });

  it("links an action to its area and drops an action whose area does not exist", () => {
    const fragments = toFragments(
      {
        ...empty,
        developmentAreas: [
          { key: "a1", text: "Obszar", evidence: ["O1"] },
          { key: "a1", text: "Powtórzony klucz", evidence: [] },
        ],
        developmentActions: [
          { areaKey: "a1", text: "Szkolenie", evidence: [] },
          { areaKey: "brak", text: "Osierocone", evidence: [] },
        ],
      },
      context,
    );
    expect(fragments.map((f) => [f.section, f.text])).toEqual([
      ["development_area", "Obszar"],
      ["development_action", "Szkolenie"],
    ]);
    expect(fragments[1]?.areaKey).toBe("a1");
  });

  it("marks general tips as having no basis in observations", () => {
    const [tip] = toFragments(
      { ...empty, feedbackTips: [{ text: "Zacznij od faktu." }] },
      context,
    );
    expect(tip).toMatchObject({
      section: "feedback_tip",
      observationIds: [],
      noEvidence: true,
    });
  });

  it("returns nothing for an empty answer", () => {
    expect(toFragments(empty, context)).toEqual([]);
  });
});
