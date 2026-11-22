import type { Doc } from "../../../convex/_generated/dataModel";

export type Stage = Doc<"reviews">["stage"];

export const STAGE_ORDER: readonly Stage[] = [
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

export const STAGE_LABELS: Record<Stage, string> = {
  setup: "Kryteria",
  opening: "Rozmowa rozpoczynająca",
  observation: "Obserwacja",
  evaluation: "Rozmowa oceniająca",
  writing: "Sporządzenie",
  signing: "Podpisy",
  objection_window: "Zapoznanie",
  objection: "Sprzeciw",
  closed: "Zamknięta",
};

const ISAP = "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=";
const ACT = `${ISAP}WDU20082271505`;

export const LEGAL = {
  art81ust1: { href: `${ACT}#art-81-ust-1`, text: "art. 81 ust. 1" },
  art81ust6: { href: `${ACT}#art-81-ust-6`, text: "art. 81 ust. 6" },
  art81ust7: { href: `${ACT}#art-81-ust-7`, text: "art. 81 ust. 7" },
  art83ust3: { href: `${ACT}#art-83-ust-3`, text: "art. 83 ust. 3" },
} as const;
