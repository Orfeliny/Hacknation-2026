import type { Doc } from "../_generated/dataModel";
import {
  computeAssessment,
  mandatoryCriteria,
  validateAdditionalCriteria,
  type RuleError,
} from "./assessment";
import { compareDates, lengthInDays } from "./dates";
import { computeDeadlines } from "./deadlines";
import { RULES_2016, type RulesPack } from "./pack2016";
import type { ReviewStage } from "./types";

type Review = Omit<
  Doc<"reviews">,
  "_id" | "_creationTime" | "employeeId" | "evaluatorId"
>;
type Employee = Pick<
  Doc<"employees">,
  "corpsRole" | "contractTerm" | "staffingEvents"
>;

// A return after this long, to another post, is not covered by the rules: HR decides (W1 16:52).
export const LONG_BREAK_DAYS = 365;

const ORDER: ReviewStage[] = [
  "setup",
  "opening",
  "observation",
  "evaluation",
  "writing",
  "signing",
  "objection_window",
  "objection",
  "closed",
];

const reached = (stage: ReviewStage, target: ReviewStage) =>
  ORDER.indexOf(stage) >= ORDER.indexOf(target);

export function isSubjectToReview(employee: Employee): boolean {
  return (
    employee.corpsRole === "official" || employee.contractTerm === "indefinite"
  );
}

// Formal gaps for the stage the review has reached (or is about to leave), in Polish.
export function validateReview(
  review: Review,
  {
    employee,
    today,
    cycleStart,
    previousResult,
  }: {
    employee: Employee;
    today: string;
    // With the cycle start, the check also applies the mandatory absence extension (art. 81 ust. 7).
    cycleStart?: string;
    previousResult?: "positive" | "negative";
  },
  rules: RulesPack = RULES_2016,
): RuleError[] {
  const s = rules.sources;
  const errors: RuleError[] = [];
  const add = (code: string, message: string, source: string | undefined) =>
    errors.push({ code, message, source: source ?? rules.source });

  if (!isSubjectToReview(employee)) {
    add(
      "not_subject",
      "Pracownik na umowie na czas określony nie podlega ocenie okresowej.",
      s.subject,
    );
  }
  if (!review.dueDate && reached(review.stage, "opening")) {
    add(
      "missing_due_date",
      "Brak terminu sporządzenia oceny w części I.",
      s.opening,
    );
  }
  const absences = (employee.staffingEvents ?? [])
    .filter((e) => e.kind === "long_absence" && e.to)
    .map((e) => ({ from: e.from, to: e.to! }));
  let effectiveDue = review.dueDate;
  const changedByHand = (review.deadlineChanges ?? []).some(
    (c) => c.status === "approved",
  );
  if (review.dueDate && cycleStart && !changedByHand) {
    const required = computeDeadlines(
      { cycleStart, previousResult, absences },
      rules,
    ).find((d) => d.kind === "review");
    if (required && compareDates(review.dueDate, required.date) < 0) {
      if (required.note) {
        add(
          "due_date_not_extended",
          `Termin oceny powinien być przedłużony o nieobecność: ${required.date} zamiast ${review.dueDate}.`,
          s.absenceExtension,
        );
      }
      effectiveDue = required.date;
    }
  }
  if (
    effectiveDue &&
    !reached(review.stage, "signing") &&
    compareDates(today, effectiveDue) > 0
  ) {
    add(
      "overdue",
      `Minął termin sporządzenia oceny (${effectiveDue.split("-").reverse().join(".")}).`,
      s.reviewPeriod,
    );
  }
  const events = employee.staffingEvents ?? [];
  const longBreak = events.find(
    (e) =>
      e.kind === "long_absence" &&
      e.to &&
      lengthInDays({ from: e.from, to: e.to }) >= LONG_BREAK_DAYS,
  );
  if (
    longBreak?.to &&
    review.stage !== "closed" &&
    events.some(
      (e) =>
        e.kind === "duties_change" && compareDates(e.from, longBreak.to!) >= 0,
    )
  ) {
    add(
      "requires_hr_decision",
      "Powrót po ponad rocznej nieobecności na inne stanowisko: przepisy tego nie regulują, o ucięciu cyklu decydują kadry.",
      s.reviewPeriod,
    );
  }

  if (!review.sheet) {
    add("missing_sheet", "Nie wybrano arkusza oceny (A, B albo C).", s.sheet);
    return errors;
  }
  const additional = review.additionalCriteria ?? [];
  errors.push(...validateAdditionalCriteria(review.sheet, additional, rules));

  const signatures = review.signatures ?? [];
  const signed = (
    role: "evaluator" | "employee",
    scope: "part_one" | "assessment",
  ) =>
    signatures.some(
      (sig) => sig.role === role && (sig.scope ?? "assessment") === scope,
    );

  if (reached(review.stage, "observation")) {
    if (!signed("evaluator", "part_one")) {
      add(
        "missing_part_one_evaluator",
        "Oceniający nie potwierdził rozmowy rozpoczynającej (część I).",
        s.openingSignatures,
      );
    }
    if (!signed("employee", "part_one")) {
      add(
        "missing_part_one_employee",
        "Oceniany nie potwierdził rozmowy i zapoznania z kryteriami (część I).",
        s.openingSignatures,
      );
    }
  }

  if (reached(review.stage, "signing")) {
    const ratings = review.ratings ?? [];
    const rated = new Set(ratings.map((r) => r.criterionId));
    const expected = new Set<string>([
      ...mandatoryCriteria(review.sheet, rules),
      ...additional,
    ]);
    for (const id of expected) {
      if (!rated.has(id)) {
        const name = rules.catalog.find((c) => c.id === id)?.name ?? id;
        add(
          "missing_rating",
          `Brak oceny cząstkowej dla kryterium „${name}”.`,
          s.partialScale,
        );
      }
    }
    if (errors.some((e) => e.code === "missing_rating") || ratings.length === 0)
      return errors;

    const allowed = new Set(rules.partialScale.map((l) => l.id));
    const invalid = ratings.filter((r) => !allowed.has(r.levelId));
    for (const r of invalid) {
      add(
        "invalid_rating",
        `Niedozwolona ocena cząstkowa „${r.levelId}” dla kryterium ${r.criterionId}.`,
        s.partialScale,
      );
    }
    if (invalid.length > 0) return errors;
    // One rating per expected criterion; stray or duplicate entries must not move the average.
    const byCriterion = new Map(
      ratings
        .filter((r) => expected.has(r.criterionId))
        .map((r) => [r.criterionId, r.levelId]),
    );
    const points = [...byCriterion.values()].map(Number);
    const result = computeAssessment(
      points,
      { isOfficial: employee.corpsRole === "official" },
      rules,
    );
    if (result.justificationRequired && !review.overallJustification?.trim()) {
      add(
        "missing_justification",
        "Ocena negatywna wymaga uzasadnienia.",
        s.justification,
      );
    }
    const plan = review.developmentPlan;
    if (
      !plan?.summary?.trim() &&
      !(plan?.areas?.length ?? 0) &&
      !(plan?.actions?.length ?? 0)
    ) {
      add(
        "missing_development_conclusions",
        "Brak wniosków dotyczących indywidualnego programu rozwoju zawodowego.",
        s.developmentConclusions,
      );
    }
    if (review.promotionRequest?.requested && !result.promotionRequestAllowed) {
      add(
        "promotion_not_allowed",
        "Wniosek o kolejny stopień służbowy można dołączyć tylko dla urzędnika służby cywilnej z oceną pozytywną.",
        s.promotionRequest,
      );
    }
    if (
      review.promotionRequest?.requested &&
      !review.promotionRequest.justification?.trim()
    ) {
      add(
        "missing_promotion_justification",
        "Wniosek o kolejny stopień służbowy wymaga umotywowania.",
        s.promotionRequest,
      );
    }
    if (!signed("evaluator", "assessment")) {
      add(
        "missing_assessment_evaluator",
        "Oceniający nie potwierdził dokonania oceny.",
        s.acknowledgement,
      );
    }
  }

  if (
    reached(review.stage, "objection_window") &&
    !signed("employee", "assessment")
  ) {
    add(
      "missing_acknowledgement",
      "Brak potwierdzenia zapoznania się z oceną (albo stwierdzenia fikcji zapoznania).",
      s.acknowledgement,
    );
  }
  return errors;
}
