import { RULES_2016 } from "../../../convex/rules/pack2016";
import { formatDate, today } from "../../lib/format";

export const SENTIMENTS = [
  { value: "positive", label: "Pozytywna" },
  { value: "development", label: "Do rozwoju" },
  { value: "neutral", label: "Neutralna" },
] as const;

export type Sentiment = (typeof SENTIMENTS)[number]["value"];

export const sentimentLabel = (value: Sentiment) =>
  SENTIMENTS.find((s) => s.value === value)?.label ?? value;

export const CRITERIA = RULES_2016.catalog.map((c) => ({
  id: c.id,
  name: c.name,
}));

export const criterionName = (id: string | undefined) =>
  CRITERIA.find((c) => c.id === id)?.name ?? "Bez kryterium";

export function isoToday(): string {
  const now = today();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function entryTitle(date: string, text: string): string {
  const start = text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text;
  return `${formatDate(date)}: ${start}`;
}

type Row = { mine: boolean; authorName: string; sharedWithName: string | null };

export function whoSees(row: Row): string {
  const successor = row.sharedWithName
    ? `, ${row.sharedWithName} (za zgodą autora)`
    : "";
  if (row.mine) return `Widzą: Ty i kadry${successor}`;
  return `Widzą: ${row.authorName} (autor), kadry i Ty (za zgodą autora)${successor}`;
}

export type Draft = {
  date: string;
  text: string;
  sentiment: Sentiment;
  criterionId: string | undefined;
};

export const emptyDraft = (): Draft => ({
  date: isoToday(),
  text: "",
  sentiment: "positive",
  criterionId: undefined,
});
