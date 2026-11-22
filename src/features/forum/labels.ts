import { RULES_2016 } from "../../../convex/rules/pack2016";
import type { ForumThreadRow } from "../../../convex/lib/contracts/forum";

export type ThreadKind = ForumThreadRow["kind"];
export type CriterionId = (typeof RULES_2016.catalog)[number]["id"];

export const KIND_LABELS: Record<ThreadKind, string> = {
  question: "Pytanie",
  recommendation: "Polecenie",
  offer: "Oferta",
  seeking_mentor: "Szukam mentora",
};

export const THREAD_KINDS = Object.keys(KIND_LABELS) as ThreadKind[];

export const CRITERIA = RULES_2016.catalog.map((entry) => ({
  value: entry.id,
  label: entry.name,
}));

export const criterionName = (id: string) =>
  CRITERIA.find((entry) => entry.value === id)?.label ?? id;
