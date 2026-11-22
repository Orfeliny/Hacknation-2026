import { RULES_2016 } from "../../../convex/rules/pack2016";

export type ReviewStageId =
  | "setup"
  | "opening"
  | "observation"
  | "evaluation"
  | "writing"
  | "signing"
  | "objection_window"
  | "objection"
  | "closed";

export const TIMELINE = [
  { label: "Kryteria", stages: ["setup"], hint: "ustalone" },
  {
    label: "Rozmowa rozpoczynająca",
    stages: ["opening"],
    hint: "potwierdź kryteria",
  },
  { label: "Obserwacja", stages: ["observation"], hint: "okres oceny" },
  {
    label: "Rozmowa oceniająca",
    stages: ["evaluation"],
    hint: "przed sporządzeniem oceny",
  },
  { label: "Sporządzenie", stages: ["writing"], hint: "pisze oceniający" },
  { label: "Zapoznanie", stages: ["signing"], hint: "potwierdzasz Ty" },
  {
    label: "Sprzeciw",
    stages: ["objection_window", "objection"],
    hint: `${RULES_2016.objectionDays} dni, jeśli zechcesz`,
  },
  { label: "Zamknięta", stages: ["closed"], hint: "w aktach" },
] as const;

export function timelineIndex(stage: ReviewStageId): number {
  return TIMELINE.findIndex((step) =>
    (step.stages as readonly string[]).includes(stage),
  );
}

export const RESULT_STAGES: readonly ReviewStageId[] = [
  "signing",
  "objection_window",
  "objection",
  "closed",
];
