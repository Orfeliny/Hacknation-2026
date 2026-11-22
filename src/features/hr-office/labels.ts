import type { Doc } from "../../../convex/_generated/dataModel";
import { plural } from "../../lib/plural";
import { STAGE_LABELS } from "../../../convex/reviews/stages";

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

export { STAGE_LABELS };

export const STAGE_COLORS: Record<Stage, string> = {
  setup: "#c0c0c0",
  opening: "#767676",
  observation: "#004e98",
  evaluation: "#3a6ea5",
  writing: "#9cb6d3",
  signing: "#6f93bd",
  objection_window: "#14202b",
  objection: "#475467",
  closed: "#d5dee8",
};

const CRITERION_LABELS: Record<string, string> = {
  terminowosc: "Terminowość",
};

export function criterionLabel(label: string): string {
  return CRITERION_LABELS[label] ?? label;
}

const ISAP = "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=";
const ACT = `${ISAP}WDU20082271505`;

export const LEGAL = {
  art81ust1: { href: `${ACT}#art-81-ust-1`, text: "art. 81 ust. 1" },
  art81ust6: { href: `${ACT}#art-81-ust-6`, text: "art. 81 ust. 6" },
  art81ust7: { href: `${ACT}#art-81-ust-7`, text: "art. 81 ust. 7" },
  art83ust3: { href: `${ACT}#art-83-ust-3`, text: "art. 83 ust. 3" },
} as const;

export const closedLabel = (n: number) =>
  plural(n, { one: "zamknięta", few: "zamknięte", many: "zamkniętych" });

export const reviewsLabel = (n: number) =>
  plural(n, { one: "ocena", few: "oceny", many: "ocen" });
