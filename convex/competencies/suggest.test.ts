import { describe, expect, it } from "vitest";
import {
  choiceErrors,
  justificationRequired,
  requiredObservations,
  suggestLevel,
  type SuggestionInput,
} from "./suggest";

const LEVELS = [
  { id: "1", label: "znacznie poniżej oczekiwań" },
  { id: "3", label: "poniżej oczekiwań" },
  { id: "5", label: "na poziomie oczekiwań" },
  { id: "7", label: "powyżej oczekiwań" },
  { id: "9", label: "znacznie powyżej oczekiwań" },
];

function input(
  levels: (string | undefined)[],
  overrides: Partial<SuggestionInput> = {},
): SuggestionInput {
  const indicatorIds = levels.map((_, i) => `w${i + 1}`);
  return {
    levels: LEVELS,
    indicatorIds,
    choices: indicatorIds.map((indicatorId, i) => ({
      indicatorId,
      levelId: levels[i],
    })),
    rule: { minObservedShare: 0.5, anchorLevelId: "5" },
    ...overrides,
  };
}

describe("minimum number of observed indicators", () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 3],
  ])("%i indicators need %i observed", (total, required) => {
    expect(requiredObservations(total, 0.5)).toBe(required);
  });

  it("never asks for fewer than one, and a share of 1 asks for all", () => {
    expect(requiredObservations(4, 0.01)).toBe(1);
    expect(requiredObservations(4, 1)).toBe(4);
  });
});

describe("suggestLevel", () => {
  it("gives no suggestion when nothing was observed, and says why", () => {
    for (const choices of [
      input([undefined, undefined, undefined]),
      input([undefined, undefined, undefined], { choices: [] }),
    ]) {
      const result = suggestLevel(choices);
      expect(result).toMatchObject({
        levelId: null,
        rule: "insufficient_observations",
        observed: 0,
        total: 3,
        required: 2,
        ordered: [],
      });
      expect(result.steps.join(" ")).toMatch(
        /Nie wybrano zachowania przy żadnym wskaźniku/,
      );
      expect(result.steps.join(" ")).toMatch(/uzasadnij/);
    }
  });

  it("gives no suggestion below the minimum and names the shortfall", () => {
    const result = suggestLevel(
      input(["7", undefined, undefined, undefined, undefined, undefined]),
    );
    expect(result.levelId).toBeNull();
    expect(result.required).toBe(3);
    expect(result.steps[1]).toBe(
      "Brakuje 2 wskaźników, więc system nie sugeruje poziomu.",
    );
  });

  it("suggests once the minimum is reached exactly", () => {
    const result = suggestLevel(input(["7", "7", undefined, undefined]));
    expect(result).toMatchObject({ levelId: "7", observed: 2, required: 2 });
    expect(result.notes).toContain(
      "Nie zaobserwowano 2 z 4 wskaźników; nie wpływają one na sugestię.",
    );
  });

  it("uses the only indicator of a one-indicator competency", () => {
    const result = suggestLevel(input(["3"]));
    expect(result).toMatchObject({
      levelId: "3",
      rule: "median_odd",
      middle: ["3"],
    });
  });

  it("takes the middle level for an odd count, whatever the order of choices", () => {
    const forward = suggestLevel(input(["9", "3", "5"]));
    const reversed = suggestLevel(input(["5", "3", "9"]));
    expect(forward.levelId).toBe("5");
    expect(forward.rule).toBe("median_odd");
    expect(forward.ordered).toEqual(["3", "5", "9"]);
    expect(reversed.levelId).toBe("5");
    expect(forward.steps[1]).toBe(
      "Poziomy zaobserwowanych wskaźników od najniższego: „poniżej oczekiwań”, „na poziomie oczekiwań”, „znacznie powyżej oczekiwań”.",
    );
  });

  it("uses the shared level when both middle levels of an even count are equal", () => {
    const result = suggestLevel(input(["3", "7", "7", "9"]));
    expect(result).toMatchObject({
      levelId: "7",
      rule: "median_even_equal",
      middle: ["7", "7"],
    });
  });

  it("takes the level exactly between two non-adjacent middle levels", () => {
    const result = suggestLevel(input(["3", "7"]));
    expect(result).toMatchObject({
      levelId: "5",
      rule: "median_even_midpoint",
      middle: ["3", "7"],
    });
  });

  it.each([
    [["3", "5"], "5"],
    [["5", "7"], "5"],
    [["1", "3"], "3"],
    [["7", "9"], "7"],
    [["1", "1", "3", "3"], "3"],
    // The median falls between two levels that are not the middle ones themselves.
    [["1", "7"], "5"],
    [["3", "9"], "5"],
  ])(
    "resolves a median between two levels %j towards the expected level: %s",
    (levels, expected) => {
      const result = suggestLevel(input(levels));
      expect(result.levelId).toBe(expected);
      expect(result.rule).toBe("median_even_tie_to_anchor");
      expect(result.steps.join(" ")).toMatch(/remis/);
    },
  );

  it("follows the tie rule of the model when the anchor level changes", () => {
    const result = suggestLevel(
      input(["3", "5"], {
        rule: { minObservedShare: 0.5, anchorLevelId: "1" },
      }),
    );
    expect(result.levelId).toBe("3");
  });

  it("orders levels by their position in the model, not by their ids", () => {
    const levels = [
      { id: "zero", label: "niski" },
      { id: "alfa", label: "średni" },
      { id: "beta", label: "wysoki" },
    ];
    const rule = { minObservedShare: 0.5, anchorLevelId: "alfa" };
    expect(
      suggestLevel(input(["beta", "zero", "alfa"], { levels, rule })).levelId,
    ).toBe("alfa");
    expect(
      suggestLevel(input(["zero", "beta", "beta"], { levels, rule })).levelId,
    ).toBe("beta");
  });

  it("flags a wide spread of indicator levels", () => {
    const result = suggestLevel(input(["1", "9"]));
    expect(result.levelId).toBe("5");
    expect(result.notes[0]).toMatch(/rozbieżne/);
    expect(suggestLevel(input(["5", "7"])).notes).toEqual([]);
  });

  it("is deterministic and keeps the indicator order of the model", () => {
    const a = suggestLevel(input(["7", undefined, "3"]));
    const b = suggestLevel(input(["7", undefined, "3"]));
    expect(a).toEqual(b);
    expect(a.indicators).toEqual([
      { indicatorId: "w1", levelId: "7" },
      { indicatorId: "w2", levelId: null },
      { indicatorId: "w3", levelId: "3" },
    ]);
  });

  it("rejects unknown indicators and levels and a twice-chosen indicator", () => {
    const bad = input(["5", "5"], {
      choices: [
        { indicatorId: "w1", levelId: "5" },
        { indicatorId: "w1", levelId: "7" },
        { indicatorId: "w9", levelId: "5" },
        { indicatorId: "w2", levelId: "4" },
      ],
    });
    expect(choiceErrors(bad)).toEqual([
      "Wskaźnik w1 wybrano więcej niż raz.",
      "Nieznany wskaźnik: w9.",
      "Nieznany poziom: 4.",
    ]);
    expect(() => suggestLevel(bad)).toThrow(/Nieznany wskaźnik/);
  });
});

describe("justificationRequired", () => {
  it("asks for a justification when the final level differs or nothing was suggested", () => {
    expect(justificationRequired("5", "5")).toBe(false);
    expect(justificationRequired("5", "7")).toBe(true);
    expect(justificationRequired(null, "5")).toBe(true);
  });
});
