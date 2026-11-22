import { plural } from "../../lib/plural";
import { today } from "../../lib/format";
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

export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - today().getTime()) / 86_400_000);
}

const DAYS = { one: "dzień", few: "dni", many: "dni" };

export function daysLabel(iso: string): string {
  const diff = daysUntil(iso);
  if (diff < 0) return "Po terminie";
  if (diff === 0) return "Dziś";
  return `za ${diff} ${plural(diff, DAYS)}`;
}

export function daysOverdue(iso: string): number {
  return Math.max(0, -daysUntil(iso));
}

export function overdueText(n: number): string {
  return `${n} ${plural(n, DAYS)}`;
}
