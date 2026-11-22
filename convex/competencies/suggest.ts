// Suggested competency level: a pure, deterministic function, so the same choices always give the
// same suggestion and every step can be shown to the evaluator. No AI is involved.

export type SuggestionLevel = { id: string; label: string };

export type SuggestionRule = {
  // Share of the competency's indicators that must be observed before anything is suggested.
  minObservedShare: number;
  // Level a tie between two adjacent middle levels is resolved towards.
  anchorLevelId: string;
};

export type IndicatorChoice = { indicatorId: string; levelId?: string };

export type SuggestionInput = {
  levels: SuggestionLevel[];
  indicatorIds: string[];
  choices: IndicatorChoice[];
  rule: SuggestionRule;
};

export type RuleFired =
  | "insufficient_observations"
  | "median_odd"
  | "median_even_equal"
  | "median_even_midpoint"
  | "median_even_tie_to_anchor";

export type Suggestion = {
  levelId: string | null;
  rule: RuleFired;
  observed: number;
  total: number;
  required: number;
  indicators: { indicatorId: string; levelId: string | null }[];
  // Observed level ids from the lowest to the highest, and the middle one or two of them.
  ordered: string[];
  middle: string[];
  steps: string[];
  notes: string[];
};

export function requiredObservations(total: number, share: number): number {
  return Math.max(1, Math.ceil(total * share));
}

// Polish messages: they reach the evaluator through the mutations.
export function choiceErrors(input: SuggestionInput): string[] {
  const errors: string[] = [];
  const indicators = new Set(input.indicatorIds);
  const levels = new Set(input.levels.map((l) => l.id));
  const seen = new Set<string>();
  for (const choice of input.choices) {
    if (!indicators.has(choice.indicatorId)) {
      errors.push(`Nieznany wskaźnik: ${choice.indicatorId}.`);
    } else if (seen.has(choice.indicatorId)) {
      errors.push(`Wskaźnik ${choice.indicatorId} wybrano więcej niż raz.`);
    }
    seen.add(choice.indicatorId);
    if (choice.levelId !== undefined && !levels.has(choice.levelId)) {
      errors.push(`Nieznany poziom: ${choice.levelId}.`);
    }
  }
  if (!levels.has(input.rule.anchorLevelId)) {
    errors.push(`Nieznany poziom oczekiwany: ${input.rule.anchorLevelId}.`);
  }
  return errors;
}

const quote = (label: string) => `„${label}”`;

export function suggestLevel(input: SuggestionInput): Suggestion {
  const errors = choiceErrors(input);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const rank = new Map(input.levels.map((l, i) => [l.id, i]));
  const label = (id: string) =>
    quote(input.levels.find((l) => l.id === id)?.label ?? id);
  const chosen = new Map(
    input.choices
      .filter((c) => c.levelId !== undefined)
      .map((c) => [c.indicatorId, c.levelId!]),
  );
  const indicators = input.indicatorIds.map((indicatorId) => ({
    indicatorId,
    levelId: chosen.get(indicatorId) ?? null,
  }));
  const ordered = indicators
    .flatMap((i) => (i.levelId === null ? [] : [i.levelId]))
    .sort((a, b) => rank.get(a)! - rank.get(b)!);
  const total = input.indicatorIds.length;
  const observed = ordered.length;
  const required = requiredObservations(total, input.rule.minObservedShare);
  const base = { observed, total, required, indicators, ordered };
  const steps = [
    `Zaobserwowane wskaźniki: ${observed} z ${total}; do wyliczenia sugestii potrzeba co najmniej ${required}.`,
  ];

  if (observed < required) {
    steps.push(
      observed === 0
        ? "Nie wybrano zachowania przy żadnym wskaźniku, więc system nie sugeruje poziomu."
        : `Brakuje ${required - observed} ${required - observed === 1 ? "wskaźnika" : "wskaźników"}, więc system nie sugeruje poziomu.`,
      "Oceń kolejne wskaźniki albo wybierz poziom samodzielnie i uzasadnij wybór.",
    );
    return {
      ...base,
      levelId: null,
      rule: "insufficient_observations",
      middle: [],
      steps,
      notes: [],
    };
  }

  steps.push(
    `Poziomy zaobserwowanych wskaźników od najniższego: ${ordered.map(label).join(", ")}.`,
  );
  const ranks = ordered.map((id) => rank.get(id) ?? 0);
  const idAt = (r: number) => input.levels.at(r)?.id ?? "";
  const half = Math.floor(observed / 2);
  let levelId: string;
  let rule: RuleFired;
  let middle: string[];
  if (observed % 2 === 1) {
    levelId = idAt(ranks.at(half) ?? 0);
    middle = [levelId];
    rule = "median_odd";
    steps.push(
      `Nieparzysta liczba ocenionych wskaźników: sugestia to poziom środkowy (mediana), ${label(levelId)}.`,
    );
  } else {
    const low = ranks.at(half - 1) ?? 0;
    const high = ranks.at(half) ?? 0;
    middle = [idAt(low), idAt(high)];
    const intro = `Parzysta liczba ocenionych wskaźników, środkowe poziomy to ${label(idAt(low))} i ${label(idAt(high))}`;
    if (low === high) {
      levelId = idAt(low);
      rule = "median_even_equal";
      steps.push(`${intro}: sugestia to ten sam poziom.`);
    } else if ((low + high) % 2 === 0) {
      levelId = idAt((low + high) / 2);
      rule = "median_even_midpoint";
      steps.push(
        `${intro}: sugestia to poziom dokładnie pomiędzy nimi, ${label(levelId)}.`,
      );
    } else {
      const anchor = rank.get(input.rule.anchorLevelId) ?? 0;
      const below = (low + high - 1) / 2;
      // The two candidates are adjacent, so they are never equally far from the anchor.
      const pick =
        Math.abs(below - anchor) < Math.abs(below + 1 - anchor)
          ? below
          : below + 1;
      levelId = idAt(pick);
      rule = "median_even_tie_to_anchor";
      steps.push(
        `${intro}: mediana wypada między poziomami ${label(idAt(below))} i ${label(idAt(below + 1))} (remis).`,
        `Remis rozstrzyga się w stronę poziomu ${label(input.rule.anchorLevelId)}, od którego zaczyna się ocena: sugestia to ${label(levelId)}.`,
      );
    }
  }

  const notes: string[] = [];
  const lowest = ranks.at(0) ?? 0;
  const highest = ranks.at(-1) ?? 0;
  if (highest - lowest >= 2) {
    notes.push(
      `Oceny wskaźników są rozbieżne (od ${label(idAt(lowest))} do ${label(idAt(highest))}); sugestia tego nie pokazuje, warto to opisać w uzasadnieniu.`,
    );
  }
  if (observed < total) {
    notes.push(
      `Nie zaobserwowano ${total - observed} z ${total} wskaźników; nie wpływają one na sugestię.`,
    );
  }
  return { ...base, levelId, rule, middle, steps, notes };
}

export function describeRule(
  rule: SuggestionRule,
  levels: SuggestionLevel[],
): string[] {
  const anchor = levels.find((l) => l.id === rule.anchorLevelId);
  return [
    "Przy każdym wskaźniku wybierz zachowanie najbliższe temu, co obserwowałeś; wskaźnik, którego nie obserwowałeś, zostaw pusty.",
    "Sugerowany poziom to mediana (wartość środkowa) poziomów wybranych przy zaobserwowanych wskaźnikach.",
    `Sugestia pojawia się, gdy zaobserwowano co najmniej ${Math.round(rule.minObservedShare * 100)}% wskaźników kompetencji (zawsze co najmniej jeden).`,
    `Przy parzystej liczbie wskaźników sugestią jest poziom pośrodku dwóch środkowych; gdy sąsiadują (remis), wybierany jest ten bliższy poziomowi ${quote(anchor?.label ?? rule.anchorLevelId)}.`,
    "Sugestia jest pomocnicza: poziom końcowy wybiera przełożony, a inny niż sugerowany wymaga uzasadnienia.",
  ];
}

// The evaluator always decides. A final level other than the suggestion, or a decision made
// without any suggestion, needs a written justification.
export function justificationRequired(
  suggestedLevelId: string | null,
  finalLevelId: string,
): boolean {
  return suggestedLevelId === null || suggestedLevelId !== finalLevelId;
}
