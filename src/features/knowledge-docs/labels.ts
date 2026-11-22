import type { KnowledgeDocumentRow } from "../../../convex/lib/contracts/knowledgeDocs";

export const STATUS_LABELS: Record<KnowledgeDocumentRow["status"], string> = {
  queued: "w kolejce",
  indexing: "przetwarzanie",
  indexed: "gotowy",
  failed: "błąd",
  needs_fix: "do poprawy",
  withdrawn: "wycofany",
};

export function scopeLabel(row: Pick<KnowledgeDocumentRow, "scope" | "unit">) {
  if (row.scope === "unit") return `Komórka: ${row.unit ?? "nieokreślona"}`;
  return row.scope === "national" ? "Wspólna baza krajowa" : "Cały urząd";
}
