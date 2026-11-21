import type { Doc } from "../_generated/dataModel";
import { RULES_2016 } from "../rules/pack2016";
import { DEVELOPMENT_LEVEL_LABELS, type DevelopmentLevel } from "./constants";

// Up to this many candidates the rule order is the answer; above it the AI may pick (#59).
export const RANK_THRESHOLD = 5;
export const MAX_RANKED = 5;

export type Suggestion = {
  option: Doc<"developmentOptions">;
  matchedCriterionIds: string[];
  reason: string;
  // Only set when the AI picked this entry.
  rationale?: string;
};

const criterionName = (id: string) =>
  RULES_2016.catalog.find((entry) => entry.id === id)?.name ?? id;

export function matchOptions(
  options: Doc<"developmentOptions">[],
  criterionIds: readonly string[],
  level?: DevelopmentLevel,
): Suggestion[] {
  const wanted = [...new Set(criterionIds)];
  const matches = options.flatMap((option) => {
    if (!option.active) return [];
    const matched = wanted.filter((id) =>
      option.criterionIds.some((c) => c === id),
    );
    if (matched.length === 0) return [];
    const names = matched.map(criterionName).join(", ");
    const reason =
      `Pasuje do ${matched.length > 1 ? "kryteriów" : "kryterium"}: ${names}` +
      (level && option.level === level
        ? `; poziom: ${DEVELOPMENT_LEVEL_LABELS[level].toLowerCase()}`
        : "");
    return [{ option, matchedCriterionIds: matched, reason }];
  });
  return matches.sort(
    (a, b) =>
      b.matchedCriterionIds.length - a.matchedCriterionIds.length ||
      Number(b.option.level === level) - Number(a.option.level === level) ||
      a.option.title.localeCompare(b.option.title, "pl"),
  );
}
