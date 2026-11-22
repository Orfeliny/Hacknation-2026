import type { Doc } from "../_generated/dataModel";
import type { Audience } from "./access";
import {
  COMPETENCY_MODEL,
  findCompetency,
  levelLabel,
  type Competency,
  type CompetencyModel,
} from "./model";
import {
  describeRule,
  suggestLevel,
  type IndicatorChoice,
  type Suggestion,
} from "./suggest";

type Assessment = Doc<"competencyAssessments">;

// Choices saved under an older model version may name indicators or levels that no longer exist.
export function currentChoices(
  competency: Competency,
  choices: IndicatorChoice[] | undefined,
  model: CompetencyModel = COMPETENCY_MODEL,
): IndicatorChoice[] {
  const indicators = new Set(competency.indicators.map((i) => i.id));
  const levels = new Set(model.levels.map((l) => l.id));
  return (choices ?? []).filter(
    (c) =>
      indicators.has(c.indicatorId) &&
      (c.levelId === undefined || levels.has(c.levelId)),
  );
}

export function suggestionFor(
  competency: Competency,
  choices: IndicatorChoice[] | undefined,
  model: CompetencyModel = COMPETENCY_MODEL,
): Suggestion {
  return suggestLevel({
    levels: model.levels,
    indicatorIds: competency.indicators.map((i) => i.id),
    choices: currentChoices(competency, choices, model),
    rule: model.suggestion,
  });
}

export function modelSummary(model: CompetencyModel = COMPETENCY_MODEL) {
  return {
    modelVersion: model.modelVersion,
    name: model.name,
    source: model.source,
    isDemo: model.source === "demo",
    sourceNote: model.sourceNote,
    levels: model.levels,
    rule: describeRule(model.suggestion, model.levels),
  };
}

// One shape for every audience; what the employee may not see is null or empty.
export function assessmentView(
  row: Assessment,
  audience: Audience,
  model: CompetencyModel = COMPETENCY_MODEL,
) {
  const competency = findCompetency(row.competencyId, model);
  const suggestion =
    audience === "employee" || !competency
      ? null
      : suggestionFor(competency, row.indicatorChoices, model);
  const drafts = audience !== "employee";
  return {
    _id: row._id,
    employeeId: row.employeeId,
    reviewId: row.reviewId ?? null,
    firstReviewId: row.firstReviewId ?? null,
    competencyId: row.competencyId,
    competencyName: competency?.name ?? row.competencyId,
    criterionId: row.criterionId ?? null,
    modelVersion: row.modelVersion,
    modelOutdated: row.modelVersion !== model.modelVersion,
    status: row.finalLevel === undefined ? "draft" : "final",
    finalLevel: row.finalLevel ?? null,
    finalLabel: levelLabel(row.finalLevel, model),
    updatedAt: row.updatedAt ?? row.createdAt,
    assessorId: drafts ? row.assessorId : null,
    indicatorChoices: drafts ? (row.indicatorChoices ?? []) : [],
    suggestedLevel: suggestion?.levelId ?? null,
    suggestedLabel: levelLabel(suggestion?.levelId ?? undefined, model),
    deviationJustification: drafts
      ? (row.deviationJustification ?? null)
      : null,
    suggestion,
  } as const;
}
