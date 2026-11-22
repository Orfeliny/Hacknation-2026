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
  { label: "Kryteria", stages: ["setup"], now: "ustal kryteria" },
  {
    label: "Rozmowa rozpoczynająca",
    stages: ["opening"],
    now: "potwierdź kryteria",
  },
  { label: "Obserwacja", stages: ["observation"], now: "okres oceny" },
  {
    label: "Rozmowa oceniająca",
    stages: ["evaluation"],
    now: "przed sporządzeniem oceny",
  },
  { label: "Sporządzenie", stages: ["writing"], now: "pisze oceniający" },
  { label: "Zapoznanie", stages: ["signing"], now: "potwierdź zapoznanie" },
  {
    label: "Sprzeciw",
    stages: ["objection_window", "objection"],
    now: "termin na sprzeciw",
  },
  { label: "Zamknięta", stages: ["closed"], now: "w aktach" },
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
