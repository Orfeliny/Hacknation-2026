import type { Doc } from "../_generated/dataModel";

export type FirstReviewStage = "report" | "assessment" | "signing" | "closed";

export const STAGE_LABELS: Record<FirstReviewStage, string> = {
  report: "Sprawozdanie pracownika",
  assessment: "Ocena",
  signing: "Podpisy",
  closed: "Zamknięta",
};

export const STAGES: FirstReviewStage[] = [
  "report",
  "assessment",
  "signing",
  "closed",
];

export function stageOf(row: Pick<Doc<"firstReviews">, "stage">) {
  const stage = STAGES.find((s) => s === row.stage);
  if (!stage) throw new Error(`Unknown first review stage: ${row.stage}`);
  return stage;
}

export function hasSigned(
  row: Pick<Doc<"firstReviews">, "signatures">,
  role: "evaluator" | "employee",
): boolean {
  return (row.signatures ?? []).some((s) => s.role === role);
}

export function pushStage(row: Doc<"firstReviews">, stage: FirstReviewStage) {
  return [...(row.stageHistory ?? []), { stage, at: Date.now() }];
}
