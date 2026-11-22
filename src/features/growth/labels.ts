import type { ForumThreadRow } from "../../../convex/lib/contracts/forum";
import { RULES_2016 } from "../../../convex/rules/pack2016";

export type ThreadKind = ForumThreadRow["kind"];
export type CriterionId = (typeof RULES_2016.catalog)[number]["id"];

export const THREAD_KINDS: readonly ThreadKind[] = [
  "question",
  "recommendation",
  "offer",
  "seeking_mentor",
];

export const THREAD_KIND_LABELS: Record<ThreadKind, string> = {
  question: "Pytanie",
  recommendation: "Polecenie",
  offer: "Oferta wewnętrzna",
  seeking_mentor: "Szukam mentora",
};

export const NEW_THREAD_KIND_LABELS: Record<ThreadKind, string> = {
  ...THREAD_KIND_LABELS,
  offer: "Oferuję warsztat lub mentoring",
};

export const CRITERIA = RULES_2016.catalog.map((entry) => ({
  value: entry.id,
  label: entry.name,
}));

export const criterionName = (id: string) =>
  CRITERIA.find((entry) => entry.value === id)?.label ?? id;

export const isCriterionId = (id: string | null): id is CriterionId =>
  CRITERIA.some((entry) => entry.value === id);
