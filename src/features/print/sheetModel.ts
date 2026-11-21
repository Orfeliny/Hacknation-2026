import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { RULES_2016, type RulesPack } from "../../../convex/rules/pack2016";
import type { SheetType } from "../../../convex/rules/types";

export type PrintableSheet = FunctionReturnType<
  typeof api.print.queries.getSheet
>;

export type PersonModel = {
  firstName: string;
  lastName: string;
  position: string;
  unit: string;
};

export type CriterionRow = {
  id: string;
  name: string;
  kind: "mandatory" | "additional";
  levelId: string | null;
  points: number | null;
  levelLabel: string | null;
  justification: string | null;
};

export type LevelRow = {
  id: string;
  label: string;
  range: string;
  selected: boolean;
};

export type SignatureBlock = { place: string; date: string } | null;

export type SheetModel = {
  reviewId: string;
  sheet: SheetType;
  stage: string;
  round: number;
  rulesVersion: string | null;
  officeName: string;
  employee: PersonModel;
  evaluator: PersonModel;
  showUnit: boolean;
  dueDate: string | null;
  openingConversationDate: string | null;
  evaluationConversationDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  scale: { id: string; label: string; points: number }[];
  mandatory: CriterionRow[];
  additional: CriterionRow[];
  average: number | null;
  levels: LevelRow[];
  overallLevelId: string | null;
  result: "positive" | "negative" | null;
  justification: string | null;
  development: {
    summary: string | null;
    strengths: string[];
    areas: string[];
    actions: string[];
  };
  isOfficial: boolean;
  previousReview: {
    result: "positive" | "negative" | "none";
    levelLabel: string | null;
    date: string | null;
  } | null;
  promotionAttached: "yes" | "no" | "not_applicable";
  promotion: {
    appointmentYear: number | null;
    currentGrade: number | null;
    currentGradeSince: string | null;
    nextGrade: number | null;
    justification: string | null;
  } | null;
  signatures: {
    partOne: { evaluator: SignatureBlock; employee: SignatureBlock };
    assessment: {
      evaluator: SignatureBlock;
      employee: SignatureBlock;
      deemedAcknowledgement: boolean;
    };
  };
  objection: { addressee: string | null; fixedAddressee: string | null };
};

export class SheetNotChosenError extends Error {
  constructor() {
    super("The review has no sheet (A, B or C) yet");
  }
}

// ISO calendar date to the form's dd.mm.rrrr.
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}.${month}.${year}` : iso;
}

function levelRange(rules: RulesPack, index: number): string {
  const max = rules.overallLevels[index]!.maxAverage;
  if (index === 0) return `do ${max} punktów`;
  const previous = rules.overallLevels[index - 1]!.maxAverage;
  return `powyżej ${previous} punktów do ${max} punktów`;
}

function criterionRow(
  id: string,
  kind: CriterionRow["kind"],
  ratings: PrintableSheet["ratings"],
  rules: RulesPack,
): CriterionRow {
  const rating = ratings.find((entry) => entry.criterionId === id);
  const level = rating
    ? rules.partialScale.find((entry) => entry.id === rating.levelId)
    : undefined;
  return {
    id,
    name: rules.catalog.find((entry) => entry.id === id)?.name ?? id,
    kind,
    levelId: level?.id ?? null,
    points: level?.value ?? null,
    levelLabel: level?.label ?? null,
    justification: rating?.justification ?? null,
  };
}

function signatureBlock(
  signatures: PrintableSheet["signatures"],
  role: "evaluator" | "employee",
  scope: "part_one" | "assessment",
): SignatureBlock {
  // A signature saved without a scope is the assessment one: part I always names its scope.
  const found = signatures.find(
    (entry) => entry.role === role && (entry.scope ?? "assessment") === scope,
  );
  return found ? { place: found.place ?? "", date: found.date } : null;
}

export function buildSheetModel(
  data: PrintableSheet,
  rules: RulesPack = RULES_2016,
): SheetModel {
  if (data.sheet === null) throw new SheetNotChosenError();
  const sheet = data.sheet;
  const mandatory = rules.sheets[sheet].mandatory.map((id) =>
    criterionRow(id, "mandatory", data.ratings, rules),
  );
  const additional = data.additionalCriteria.map((id) =>
    criterionRow(id, "additional", data.ratings, rules),
  );
  // The stored level wins; without it the mean decides, as on the paper form.
  const levelIndex = data.overallLevelId
    ? rules.overallLevels.findIndex((level) => level.id === data.overallLevelId)
    : data.averageScore === null
      ? -1
      : rules.overallLevels.findIndex(
          (level) => data.averageScore! <= level.maxAverage,
        );
  const levels = rules.overallLevels.map((level, index) => ({
    id: level.id,
    label: level.label,
    range: levelRange(rules, index),
    selected: index === levelIndex,
  }));
  const plan = data.developmentPlan;
  const previous = data.previousReview;
  const promotion = data.promotionRequest;
  const isOfficial = data.employee.isOfficial;
  const promotionShown = isOfficial && promotion?.requested === true;
  const deemed = data.signatures.some(
    (entry) => entry.role === "employee" && entry.deemedAcknowledgement,
  );
  return {
    reviewId: data.reviewId,
    sheet,
    stage: data.stage,
    round: data.round,
    rulesVersion: data.rulesVersion,
    officeName: data.officeName,
    employee: data.employee,
    evaluator: data.evaluator,
    showUnit: sheet !== "A",
    dueDate: data.dueDate,
    openingConversationDate: data.openingConversationDate,
    evaluationConversationDate: data.evaluationConversationDate,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    scale: rules.partialScale.map(({ id, label, value }) => ({
      id,
      label,
      points: value,
    })),
    mandatory,
    additional,
    average: data.averageScore,
    levels,
    overallLevelId: levels[levelIndex]?.id ?? null,
    result: data.overallResult,
    justification: data.overallJustification,
    development: {
      summary: plan?.summary ?? null,
      strengths: plan?.strengths ?? [],
      areas: (plan?.areas ?? []).map((area) => area.text),
      actions: (plan?.actions ?? []).map((action) => action.text),
    },
    isOfficial,
    previousReview:
      isOfficial && previous
        ? {
            result: previous.result,
            levelLabel:
              rules.overallLevels.find((level) => level.id === previous.levelId)
                ?.label ?? null,
            date: previous.date ?? null,
          }
        : null,
    promotionAttached: !isOfficial
      ? "not_applicable"
      : promotionShown
        ? "yes"
        : "no",
    promotion:
      promotionShown && promotion
        ? {
            appointmentYear: promotion.appointmentYear,
            currentGrade: promotion.currentGrade,
            currentGradeSince: promotion.currentGradeSince,
            nextGrade:
              promotion.currentGrade !== null && promotion.currentGrade < 9
                ? promotion.currentGrade + 1
                : null,
            justification: promotion.justification,
          }
        : null,
    signatures: {
      partOne: {
        evaluator: signatureBlock(data.signatures, "evaluator", "part_one"),
        employee: signatureBlock(data.signatures, "employee", "part_one"),
      },
      assessment: {
        evaluator: signatureBlock(data.signatures, "evaluator", "assessment"),
        employee: signatureBlock(data.signatures, "employee", "assessment"),
        deemedAcknowledgement: deemed,
      },
    },
    objection: {
      addressee: sheet === "A" ? data.objectionAddressee : null,
      fixedAddressee: sheet === "A" ? null : "dyrektora generalnego urzędu",
    },
  };
}
