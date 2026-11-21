import type { Doc } from "../_generated/dataModel";
import { mandatoryCriteria, type RuleError } from "../rules/assessment";
import { compareDates } from "../rules/dates";
import { RULES_2016, type RulesPack } from "../rules/pack2016";
import { validateReview } from "../rules/validateReview";
import type { ReviewStage } from "../rules/types";

type Review = Doc<"reviews">;
type Employee = Doc<"employees">;

export const WIZARD_STAGES: ReviewStage[] = [
  "opening",
  "observation",
  "evaluation",
  "writing",
  "signing",
  "objection_window",
  "closed",
];

export const STAGE_LABELS: Record<ReviewStage, string> = {
  setup: "Przygotowanie",
  opening: "Rozmowa rozpoczynająca",
  observation: "Okres oceny",
  evaluation: "Rozmowa oceniająca",
  writing: "Sporządzenie oceny",
  signing: "Podpisy",
  objection_window: "Zapoznanie i sprzeciw",
  objection: "Sprzeciw",
  closed: "Zamknięta",
};

const NEXT: Partial<Record<ReviewStage, ReviewStage>> = {
  setup: "opening",
  opening: "observation",
  observation: "evaluation",
  evaluation: "writing",
  writing: "signing",
  signing: "objection_window",
  objection_window: "closed",
};

export function nextStage(stage: ReviewStage): ReviewStage | undefined {
  return NEXT[stage];
}

// Which fields a step may edit; part I is also locked once either side has confirmed it.
export const EDITABLE_STAGES: ReviewStage[] = [
  "opening",
  "observation",
  "evaluation",
  "writing",
];

export const FIELD_STAGE = {
  additionalCriteria: "opening",
  openingConversationDate: "opening",
  expectations: "opening",
  periodStart: "observation",
  periodEnd: "observation",
  evaluationConversationDate: "evaluation",
  ratings: "writing",
  overallJustification: "writing",
  developmentPlan: "writing",
  promotionRequest: "writing",
} as const satisfies Record<string, ReviewStage>;

export type EditableField = keyof typeof FIELD_STAGE;

export function expectedCriteria(
  review: Pick<Review, "sheet" | "additionalCriteria">,
  rules: RulesPack = RULES_2016,
): string[] {
  if (!review.sheet) return [];
  return [
    ...mandatoryCriteria(review.sheet, rules),
    ...(review.additionalCriteria ?? []),
  ];
}

const gap = (code: string, message: string, source: string): RuleError => ({
  code,
  message,
  source,
});

// Gaps specific to the wizard step the review is leaving, on top of validateReview.
export function stepGaps(
  review: Review,
  rules: RulesPack = RULES_2016,
): RuleError[] {
  const s = rules.sources;
  const out: RuleError[] = [];
  if (review.stage === "opening") {
    if (!review.openingConversationDate) {
      out.push(
        gap(
          "missing_opening_date",
          "Brak daty rozmowy rozpoczynającej.",
          s.opening ?? rules.source,
        ),
      );
    }
    for (const id of expectedCriteria(review, rules)) {
      const text = review.expectations?.find((e) => e.criterionId === id)?.text;
      if (!text?.trim()) {
        const name = rules.catalog.find((c) => c.id === id)?.name ?? id;
        out.push(
          gap(
            "missing_expectation",
            `Brak ustalonych oczekiwań dla kryterium „${name}”.`,
            s.openingSignatures ?? rules.source,
          ),
        );
      }
    }
  }
  if (review.stage === "observation") {
    if (!review.periodStart || !review.periodEnd) {
      out.push(
        gap(
          "missing_period",
          "Brak okresu, w którym oceniany podlegał ocenie (od - do).",
          s.reviewPeriod ?? rules.source,
        ),
      );
    } else if (compareDates(review.periodStart, review.periodEnd) > 0) {
      out.push(
        gap(
          "period_reversed",
          "Początek okresu oceny jest późniejszy niż jego koniec.",
          s.reviewPeriod ?? rules.source,
        ),
      );
    }
    const missingOpinion = (review.staffingSituations ?? []).some(
      (x) => x.kind === "evaluator_change" && !x.note?.trim(),
    );
    if (missingOpinion) {
      out.push(
        gap(
          "missing_departing_opinion",
          "Zmiana oceniającego: brak opinii odchodzącego oceniającego dla następcy.",
          s.deadlineChange ?? rules.source,
        ),
      );
    }
  }
  if (review.stage === "evaluation" && !review.evaluationConversationDate) {
    out.push(
      gap(
        "missing_evaluation_date",
        "Brak daty rozmowy oceniającej.",
        s.reviewPeriod ?? rules.source,
      ),
    );
  }
  return out;
}

// Gaps that stop the review from moving to the next stage. A late review is a warning, not a block;
// the evaluator's own assessment signature is given in the signing stage, so entering it ignores it.
export function blockingGaps(
  review: Review,
  employee: Employee,
  context: {
    today: string;
    cycleStart?: string;
    previousResult?: "positive" | "negative";
  },
  rules: RulesPack = RULES_2016,
): RuleError[] {
  const target = nextStage(review.stage);
  if (!target) return [];
  const ignored = new Set(["overdue"]);
  if (target === "signing") ignored.add("missing_assessment_evaluator");
  const rule = validateReview(
    { ...review, stage: target },
    { employee, ...context },
    rules,
  );
  return [
    ...stepGaps(review, rules),
    ...rule.filter((e) => !ignored.has(e.code)),
  ];
}

export function warnings(
  review: Review,
  employee: Employee,
  context: {
    today: string;
    cycleStart?: string;
    previousResult?: "positive" | "negative";
  },
  rules: RulesPack = RULES_2016,
): RuleError[] {
  return validateReview(review, { employee, ...context }, rules).filter(
    (e) => e.code === "overdue",
  );
}

export function formatGaps(gaps: RuleError[]): string {
  return `Nie można przejść dalej, bo w ocenie są braki formalne:\n${gaps
    .map((g) => `- ${g.message}`)
    .join("\n")}`;
}
