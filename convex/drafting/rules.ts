// A rating the evaluator chose, as points of the partial scale (1, 3, 5, 7 or 9).
export type RatedCriterion = { criterionId: string; points: number };

export type ObservationFact = {
  id: string;
  criterionId?: string;
  sentiment: "positive" | "development" | "neutral";
};

export type InconsistencyCode =
  | "high_rating_development_notes"
  | "low_rating_positive_notes"
  | "no_observations";

export type Inconsistency = {
  criterionId: string;
  code: InconsistencyCode;
  message: string;
};

export const HIGH_RATING = 7;
export const LOW_RATING = 3;

// Looks only at observations tagged with the criterion: an untagged observation cannot be attributed.
// Rules, not AI, so every flag is explainable and tested.
export function findInconsistencies(
  ratings: RatedCriterion[],
  observations: ObservationFact[],
): Inconsistency[] {
  const result: Inconsistency[] = [];
  for (const rating of ratings) {
    const notes = observations.filter(
      (o) => o.criterionId === rating.criterionId,
    );
    if (notes.length === 0) {
      result.push({
        criterionId: rating.criterionId,
        code: "no_observations",
        message:
          "Brak obserwacji oznaczonych tym kryterium: uzasadnienie nie ma na czym się oprzeć.",
      });
    } else if (
      rating.points >= HIGH_RATING &&
      notes.every((o) => o.sentiment === "development")
    ) {
      result.push({
        criterionId: rating.criterionId,
        code: "high_rating_development_notes",
        message:
          "Wysoka ocena, a wszystkie obserwacje tego kryterium wskazują na obszar do rozwoju. Sprawdź, czy ocena jest spójna z obserwacjami.",
      });
    } else if (
      rating.points <= LOW_RATING &&
      notes.every((o) => o.sentiment === "positive")
    ) {
      result.push({
        criterionId: rating.criterionId,
        code: "low_rating_positive_notes",
        message:
          "Niska ocena, a wszystkie obserwacje tego kryterium są pozytywne. Sprawdź, czy ocena jest spójna z obserwacjami.",
      });
    }
  }
  return result;
}
