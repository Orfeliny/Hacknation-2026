import {
  addDays,
  addMonths,
  compareDates,
  lastsLongerThanMonths,
  lengthInDays,
  mergeContinuousAbsences,
  nextWorkingDay,
  type Period,
} from "./dates";
import { RULES_2016, type RulesPack } from "./pack2016";

export type DeadlineKind =
  | "opening"
  | "review"
  | "reevaluation"
  | "objection"
  | "objection_decision"
  | "mandatory_promotion";

export type Deadline = {
  kind: DeadlineKind;
  date: string;
  source: string;
  note?: string;
};

export type DeadlineInput = {
  // Day of the previous written review, or of indefinite employment / appointment.
  cycleStart: string;
  previousResult?: "positive" | "negative";
  absences?: Period[];
  // Approved deadline changes (art. 81 ust. 8) replace the computed review date.
  overrideReviewDate?: string;
  acknowledgedAt?: string;
  objectionFiledAt?: string;
  // Two consecutive positive reviews on the two highest levels (art. 89 ust. 2).
  mandatoryPromotionEarned?: boolean;
};

export function absenceExtensionDays(
  absences: Period[],
  rules: RulesPack = RULES_2016,
): number {
  return mergeContinuousAbsences(absences)
    .filter((p) =>
      lastsLongerThanMonths(p, rules.absenceExtensionThresholdMonths),
    )
    .reduce((sum, p) => sum + lengthInDays(p), 0);
}

export function computeDeadlines(
  input: DeadlineInput,
  rules: RulesPack = RULES_2016,
): Deadline[] {
  const s = rules.sources;
  const due = (date: string) => nextWorkingDay(date);
  const afterNegative = input.previousResult === "negative";
  const deadlines: Deadline[] = [
    {
      kind: "opening",
      date: due(
        addDays(
          input.cycleStart,
          afterNegative ? rules.openingDaysAfterNegative : rules.openingDays,
        ),
      ),
      source: s.opening ?? rules.source,
      note: afterNegative ? "7 dni po ocenie negatywnej" : undefined,
    },
  ];
  const extension = absenceExtensionDays(input.absences ?? [], rules);
  const reviewDate =
    input.overrideReviewDate ??
    addDays(addMonths(input.cycleStart, rules.reviewPeriodMonths), extension);
  deadlines.push({
    kind: "review",
    date: due(reviewDate),
    source: input.overrideReviewDate
      ? "ustawa o służbie cywilnej art. 81 ust. 8"
      : `${s.reviewPeriod ?? rules.source}${extension ? `; ${s.absenceExtension}` : ""}`,
    note:
      extension && !input.overrideReviewDate
        ? `przedłużony o ${extension} dni nieobecności`
        : undefined,
  });
  if (input.acknowledgedAt) {
    deadlines.push({
      kind: "objection",
      date: due(addDays(input.acknowledgedAt, rules.objectionDays)),
      source: s.objection ?? rules.source,
    });
  }
  if (input.objectionFiledAt) {
    deadlines.push({
      kind: "objection_decision",
      date: due(addDays(input.objectionFiledAt, rules.objectionDecisionDays)),
      source: s.objectionDecision ?? rules.source,
    });
  }
  if (input.mandatoryPromotionEarned && input.acknowledgedAt) {
    deadlines.push({
      kind: "mandatory_promotion",
      date: due(addDays(input.acknowledgedAt, rules.mandatoryPromotionDays)),
      source: s.mandatoryPromotion ?? rules.source,
    });
  }
  return deadlines;
}

// art. 81 ust. 9: after a negative review the next one follows 6 months after acknowledgement.
export function reevaluationDate(
  acknowledgedAt: string,
  rules: RulesPack = RULES_2016,
): Deadline {
  return {
    kind: "reevaluation",
    date: nextWorkingDay(
      addMonths(acknowledgedAt, rules.reevaluationAfterNegativeMonths),
    ),
    source: rules.sources.reevaluation ?? rules.source,
  };
}

export function isOverdue(deadline: Deadline, today: string): boolean {
  return compareDates(today, deadline.date) > 0;
}
