import type { Id } from "../_generated/dataModel";
import type { DraftOutput } from "./prompts";
import { findInconsistencies } from "./rules";

type Context = {
  ratings: { criterionId: string; points: number }[];
  observations: {
    label: string;
    id: Id<"observations">;
    criterionId: string | null;
    sentiment: "positive" | "development" | "neutral";
  }[];
};

export type Fragment = {
  section:
    | "criterion_justification"
    | "strength"
    | "development_area"
    | "development_action"
    | "feedback_tip";
  text: string;
  criterionId?: string;
  observationIds: Id<"observations">[];
  noEvidence: boolean;
  inconsistency?: string;
  key?: string;
  areaKey?: string;
};

// Turns the model's answer into stored fragments. The model cites observations by label; a label it
// did not receive is dropped, and a fragment left with no valid label says "no basis" instead of
// pretending to have one. A justification gets the inconsistency (if any) found by the rules.
export function toFragments(output: DraftOutput, context: Context): Fragment[] {
  const byLabel = new Map(
    context.observations.map((o) => [o.label.toUpperCase(), o.id]),
  );
  const resolve = (labels: string[]): Id<"observations">[] => {
    const ids = new Set<Id<"observations">>();
    for (const label of labels) {
      const id = byLabel.get(label.trim().toUpperCase());
      if (id) ids.add(id);
    }
    return [...ids];
  };
  const withEvidence = (labels: string[]) => {
    const observationIds = resolve(labels);
    return { observationIds, noEvidence: observationIds.length === 0 };
  };
  const flags = new Map(
    findInconsistencies(
      context.ratings.map((r) => ({
        criterionId: r.criterionId,
        points: r.points,
      })),
      context.observations.map((o) => ({
        id: o.id,
        criterionId: o.criterionId ?? undefined,
        sentiment: o.sentiment,
      })),
    ).map((flag) => [flag.criterionId, flag.message]),
  );
  const rated = new Set(context.ratings.map((r) => r.criterionId));
  const fragments: Fragment[] = [];

  const seenCriteria = new Set<string>();
  for (const item of output.criteria) {
    if (!rated.has(item.criterionId) || seenCriteria.has(item.criterionId)) {
      continue;
    }
    seenCriteria.add(item.criterionId);
    fragments.push({
      section: "criterion_justification",
      text: item.text,
      criterionId: item.criterionId,
      inconsistency: flags.get(item.criterionId),
      ...withEvidence(item.evidence),
    });
  }
  for (const item of output.strengths) {
    fragments.push({
      section: "strength",
      text: item.text,
      ...withEvidence(item.evidence),
    });
  }
  const seenAreas = new Set<string>();
  for (const item of output.developmentAreas) {
    if (seenAreas.has(item.key)) continue;
    seenAreas.add(item.key);
    fragments.push({
      section: "development_area",
      text: item.text,
      key: item.key,
      ...withEvidence(item.evidence),
    });
  }
  for (const item of output.developmentActions) {
    // An action without a known area cannot be linked, so it is dropped rather than shown loose.
    if (!seenAreas.has(item.areaKey)) continue;
    fragments.push({
      section: "development_action",
      text: item.text,
      areaKey: item.areaKey,
      ...withEvidence(item.evidence),
    });
  }
  for (const item of output.feedbackTips) {
    fragments.push({
      section: "feedback_tip",
      text: item.text,
      observationIds: [],
      noEvidence: true,
    });
  }
  return fragments;
}
