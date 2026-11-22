import { describe, expect, it } from "vitest";
import {
  findInconsistencies,
  type ObservationFact,
  type RatedCriterion,
} from "./rules";

// null stands for an observation with no criterion tag.
const note = (
  id: string,
  sentiment: ObservationFact["sentiment"],
  criterionId: string | null = "komunikacja",
): ObservationFact => ({
  id,
  sentiment,
  criterionId: criterionId ?? undefined,
});

const rating = (
  points: number,
  criterionId = "komunikacja",
): RatedCriterion => ({
  criterionId,
  points,
});

const codes = (ratings: RatedCriterion[], observations: ObservationFact[]) =>
  findInconsistencies(ratings, observations).map((item) => item.code);

describe("findInconsistencies", () => {
  it("flags a high rating when every observation of the criterion points to development", () => {
    expect(codes([rating(7)], [note("a", "development")])).toEqual([
      "high_rating_development_notes",
    ]);
    expect(
      codes([rating(9)], [note("a", "development"), note("b", "development")]),
    ).toEqual(["high_rating_development_notes"]);
  });

  it("does not flag a high rating when at least one observation is not negative", () => {
    expect(
      codes([rating(7)], [note("a", "development"), note("b", "positive")]),
    ).toEqual([]);
    expect(
      codes([rating(7)], [note("a", "development"), note("b", "neutral")]),
    ).toEqual([]);
  });

  it("flags a low rating when every observation of the criterion is positive", () => {
    expect(codes([rating(3)], [note("a", "positive")])).toEqual([
      "low_rating_positive_notes",
    ]);
    expect(codes([rating(1)], [note("a", "positive")])).toEqual([
      "low_rating_positive_notes",
    ]);
  });

  it("does not flag a low rating that has a development observation", () => {
    expect(
      codes([rating(3)], [note("a", "positive"), note("b", "development")]),
    ).toEqual([]);
  });

  it("leaves a middle rating alone whatever the observations say", () => {
    expect(codes([rating(5)], [note("a", "development")])).toEqual([]);
    expect(codes([rating(5)], [note("a", "positive")])).toEqual([]);
  });

  it("flags a rating that has no observation tagged with its criterion", () => {
    expect(codes([rating(5)], [])).toEqual(["no_observations"]);
    expect(
      codes(
        [rating(5)],
        [note("a", "positive", "wspolpraca"), note("b", "neutral", null)],
      ),
    ).toEqual(["no_observations"]);
  });

  it("judges every criterion on its own observations", () => {
    const result = findInconsistencies(
      [
        rating(9, "komunikacja"),
        rating(3, "wspolpraca"),
        rating(5, "rzetelnosc"),
      ],
      [
        note("a", "development", "komunikacja"),
        note("b", "positive", "wspolpraca"),
        note("c", "positive", "rzetelnosc"),
      ],
    );
    expect(result.map((item) => [item.criterionId, item.code])).toEqual([
      ["komunikacja", "high_rating_development_notes"],
      ["wspolpraca", "low_rating_positive_notes"],
    ]);
  });

  it("explains each flag in Polish", () => {
    const [flag] = findInconsistencies([rating(9)], [note("a", "development")]);
    expect(flag?.message).toMatch(/Wysoka ocena/);
  });

  it("returns nothing when nothing is rated", () => {
    expect(findInconsistencies([], [note("a", "positive")])).toEqual([]);
  });
});
