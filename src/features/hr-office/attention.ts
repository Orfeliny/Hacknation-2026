import type { BoardRow, ObjectionRow } from "./types";

export type AttentionItem =
  | { kind: "overdue"; key: string; date: string; row: BoardRow }
  | { kind: "objection"; key: string; date: string; row: ObjectionRow };

export function buildAttention(
  board: readonly BoardRow[],
  objections: readonly ObjectionRow[],
): AttentionItem[] {
  const overdue = board
    .filter((r) => r.overdue && r.dueDate !== null)
    .map((row): AttentionItem => ({
      kind: "overdue",
      key: `o:${row.reviewId}`,
      date: row.dueDate!,
      row,
    }));
  const filed = objections.map((row): AttentionItem => ({
    kind: "objection",
    key: `s:${row.reviewId}`,
    date: row.decisionDeadline,
    row,
  }));
  return [...overdue, ...filed].sort((a, b) => a.date.localeCompare(b.date));
}
