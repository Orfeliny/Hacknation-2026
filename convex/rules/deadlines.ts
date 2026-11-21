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
  // Day the employee acknowledged the previous review; after a negative one the next review
  // follows 6 months later (art. 81 ust. 9).
  previousAcknowledgedAt?: string;
  absences?: Period[];
  // Approved deadline changes (art. 81 ust. 8) replace the computed review date.
  overrideReviewDate?: string;
  acknowledgedAt?: string;
  objectionFiledAt?: string;
  // Two consecutive positive reviews on the two highest levels (art. 89 ust. 2).
  mandatoryPromotionEarned?: boolean;
};

function clipPeriods(periods: Period[], from: string, to: string): Period[] {
  return periods
    .map((p) => ({
      from: compareDates(p.from, from) < 0 ? from : p.from,
      to: compareDates(p.to, to) > 0 ? to : p.to,
    }))
    .filter((p) => compareDates(p.from, p.to) <= 0);
}

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
  const baseReviewDate = afterNegative
    ? addMonths(
        input.previousAcknowledgedAt ?? input.cycleStart,
        rules.reevaluationAfterNegativeMonths,
      )
    : addMonths(input.cycleStart, rules.reviewPeriodMonths);
  // Only absences inside the review period extend it.
  const extension = absenceExtensionDays(
    clipPeriods(input.absences ?? [], input.cycleStart, baseReviewDate),
    rules,
  );
  const reviewDate =
    input.overrideReviewDate ?? addDays(baseReviewDate, extension);
  const baseSource = afterNegative
    ? (s.reevaluation ?? rules.source)
    : (s.reviewPeriod ?? rules.source);
  deadlines.push({
    kind: "review",
    date: due(reviewDate),
    source: input.overrideReviewDate
      ? "ustawa o służbie cywilnej art. 81 ust. 8"
      : `${baseSource}${extension ? `; ${s.absenceExtension}` : ""}`,
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

// art. 81 ust. 8: the date may move (e.g. a departing evaluator reviews early, or the employee asks)
// only when more than 6 months have passed since the last review or, for a first review, since the
// cycle began. The KPRM interview of 21.11 names forgotten conditions as a common error.
export function deadlineChangeAllowed(
  cycleStart: string,
  today: string,
  rules: RulesPack = RULES_2016,
): { allowed: boolean; from: string; source: string } {
  const from = addMonths(cycleStart, rules.deadlineChangeAfterMonths);
  return {
    allowed: compareDates(today, from) > 0,
    from,
    source: rules.sources.deadlineChange ?? rules.source,
  };
}

// Evaluator change: the departing evaluator may review early when the general condition of
// art. 81 ust. 8 holds and they supervised the employee for at least 6 months. An option the UI
// offers, never forced (KPRM interviews, W2 21:44).
export function earlyReviewOnEvaluatorChange(
  {
    cycleStart,
    supervisedSince,
    today,
  }: { cycleStart: string; supervisedSince: string; today: string },
  rules: RulesPack = RULES_2016,
): { available: boolean; reason: string; source: string } {
  const general = deadlineChangeAllowed(cycleStart, today, rules);
  const longEnough =
    compareDates(
      today,
      addMonths(supervisedSince, rules.deadlineChangeAfterMonths),
    ) >= 0;
  const reason = !general.allowed
    ? `Od początku cyklu nie minęło 6 miesięcy (możliwe od ${addDays(general.from, 1)}).`
    : !longEnough
      ? "Odchodzący oceniający nadzorował pracownika krócej niż 6 miesięcy; ocenia nowy oceniający za cały okres."
      : "Odchodzący oceniający może sporządzić ocenę przed odejściem.";
  return {
    available: general.allowed && longEnough,
    reason,
    source: general.source,
  };
}
