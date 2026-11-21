import {
  RULES_2016,
  type CriterionId,
  type OverallLevelId,
  type RulesPack,
} from "./pack2016";
import type { Criterion, PositionKind, RatingScale, SheetType } from "./types";

export function pickSheet(
  positionKind: PositionKind,
  rules: RulesPack = RULES_2016,
): SheetType {
  const entry = (
    Object.entries(rules.sheets) as [
      SheetType,
      RulesPack["sheets"][SheetType],
    ][]
  ).find(([, sheet]) => sheet.positionKind === positionKind);
  if (!entry) throw new Error(`No sheet for position kind ${positionKind}`);
  return entry[0];
}

export function criteriaForSheet(
  sheet: SheetType,
  rules: RulesPack = RULES_2016,
): Criterion[] {
  const mandatory = rules.sheets[sheet].mandatory;
  return rules.catalog.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.indicators.join(" "),
    kind: mandatory.includes(entry.id) ? "mandatory" : "additional",
    sheets: [sheet],
    source: mandatory.includes(entry.id)
      ? rules.sheets[sheet].source
      : (rules.sources.additionalCriteria ?? rules.source),
  }));
}

export function ratingScale(rules: RulesPack = RULES_2016): RatingScale {
  return { id: `partial-${rules.version}`, levels: rules.partialScale };
}

export type RuleError = { code: string; message: string; source: string };

export function validateAdditionalCriteria(
  sheet: SheetType,
  chosen: string[],
  rules: RulesPack = RULES_2016,
): RuleError[] {
  const source = rules.sources.additionalCriteria ?? rules.source;
  const errors: RuleError[] = [];
  const known = new Set<string>(rules.catalog.map((c) => c.id));
  const mandatory = new Set<string>(rules.sheets[sheet].mandatory);
  if (chosen.length > rules.maxAdditionalCriteria) {
    errors.push({
      code: "too_many_additional",
      message: `Można wybrać najwyżej ${rules.maxAdditionalCriteria} kryteria dodatkowe.`,
      source,
    });
  }
  if (new Set(chosen).size !== chosen.length) {
    errors.push({
      code: "duplicate_additional",
      message: "Kryteria dodatkowe nie mogą się powtarzać.",
      source,
    });
  }
  for (const id of chosen) {
    if (!known.has(id)) {
      errors.push({
        code: "unknown_criterion",
        message: `Nieznane kryterium: ${id}.`,
        source,
      });
    } else if (mandatory.has(id)) {
      errors.push({
        code: "mandatory_as_additional",
        message: `Kryterium „${rules.catalog.find((c) => c.id === id)?.name}” jest obowiązkowe w arkuszu ${sheet}, nie może być dodatkowe.`,
        source,
      });
    }
  }
  return errors;
}

export type AssessmentResult = {
  average: number;
  levelId: OverallLevelId;
  result: "positive" | "negative";
  justificationRequired: boolean;
  promotionRequestAllowed: boolean;
};

// § 11 ust. 1: level from the arithmetic mean; any 1-point rating makes the review negative.
export function computeAssessment(
  points: number[],
  { isOfficial = false }: { isOfficial?: boolean } = {},
  rules: RulesPack = RULES_2016,
): AssessmentResult {
  if (points.length === 0) throw new Error("No partial ratings");
  const allowed = new Set(rules.partialScale.map((l) => l.value));
  for (const p of points)
    if (!allowed.has(p)) throw new Error(`Invalid partial rating: ${p}`);
  const average = points.reduce((sum, p) => sum + p, 0) / points.length;
  const level =
    rules.overallLevels.find((l) => average <= l.maxAverage) ??
    rules.overallLevels.at(-1)!;
  const lowest = Math.min(...rules.partialScale.map((l) => l.value));
  const positive = average > rules.positiveAbove && !points.includes(lowest);
  return {
    average,
    levelId: level.id,
    result: positive ? "positive" : "negative",
    justificationRequired: !positive,
    promotionRequestAllowed: positive && isOfficial,
  };
}

export function mandatoryCriteria(
  sheet: SheetType,
  rules: RulesPack = RULES_2016,
): CriterionId[] {
  return rules.sheets[sheet].mandatory;
}
