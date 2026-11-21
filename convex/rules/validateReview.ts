import type { Doc } from "../_generated/dataModel";
import {
  computeAssessment,
  mandatoryCriteria,
  validateAdditionalCriteria,
  type RuleError,
} from "./assessment";
import { compareDates } from "./dates";
import { RULES_2016, type RulesPack } from "./pack2016";
import type { ReviewStage } from "./types";

type Review = Omit<
  Doc<"reviews">,
  "_id" | "_creationTime" | "employeeId" | "evaluatorId"
>;
type Employee = Pick<Doc<"employees">, "corpsRole" | "contractTerm">;

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
  { employee, today }: { employee: Employee; today: string },
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
  if (!review.sheet) {
    add("missing_sheet", "Nie wybrano arkusza oceny (A, B albo C).", s.sheet);
    return errors;
  }
  const additional = review.additionalCriteria ?? [];
  errors.push(...validateAdditionalCriteria(review.sheet, additional, rules));

  if (!review.dueDate)
    add(
      "missing_due_date",
      "Brak terminu sporządzenia oceny w części I.",
      s.opening,
    );
  if (
    review.dueDate &&
    review.stage !== "closed" &&
    !reached(review.stage, "signing") &&
    compareDates(today, review.dueDate) > 0
  ) {
    add(
      "overdue",
      `Minął termin sporządzenia oceny (${review.dueDate}).`,
      s.reviewPeriod,
    );
  }

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
    for (const id of [
      ...mandatoryCriteria(review.sheet, rules),
      ...additional,
    ]) {
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

    const points = ratings.map((r) => Number(r.levelId));
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
