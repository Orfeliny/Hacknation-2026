import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

export type DashboardRow = FunctionReturnType<
  typeof api.reviews.queries.dashboard
>[number];

export const SOON_DAYS = 7;

const WAITING_STAGES = new Set<DashboardRow["stage"]>([
  "objection_window",
  "objection",
]);

export const isWaiting = (row: DashboardRow) => WAITING_STAGES.has(row.stage);

const byDeadline = (a: string | null, b: string | null) =>
  (a ?? "9999-12-31").localeCompare(b ?? "9999-12-31");

export function splitRows(rows: readonly DashboardRow[]) {
  const todo = rows
    .filter((r) => !isWaiting(r))
    .sort((a, b) => byDeadline(a.dueDate, b.dueDate));
  const waiting = rows
    .filter(isWaiting)
    .sort((a, b) =>
      byDeadline(
        a.objectionDeadline ?? a.dueDate,
        b.objectionDeadline ?? b.dueDate,
      ),
    );
  return { todo, waiting };
}

export function procedureStats(todo: readonly DashboardRow[]) {
  return {
    overdue: todo.filter((r) => r.daysLeft !== null && r.daysLeft < 0).length,
    soon: todo.filter(
      (r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= SOON_DAYS,
    ).length,
    gaps: todo.reduce((sum, r) => sum + r.gapCount, 0),
  };
}

export type RowAction = {
  label: string;
  srSuffix: string;
  to: string;
};

export function actionFor(row: DashboardRow): RowAction {
  if (row.stage === "opening" || row.stage === "evaluation") {
    const kind = row.stage === "opening" ? "rozpoczynajaca" : "oceniajaca";
    return {
      label: "Przygotuj rozmowę",
      srSuffix: `: ${row.employeeName}`,
      to: `/rozmowy?pracownik=${row.employeeId}&rodzaj=${kind}`,
    };
  }
  return {
    label: "Kontynuuj ocenę",
    srSuffix: `: ${row.employeeName}`,
    to: `/oceny?ocena=${row.reviewId}`,
  };
}

export const previewPath = (row: DashboardRow) =>
  `/oceny?ocena=${row.reviewId}&tryb=podglad`;

export function dayCount(days: number): string {
  if (days === 0) return "dzisiaj";
  const abs = Math.abs(days);
  const noun = abs === 1 ? "dzień" : "dni";
  return days < 0 ? `${abs} ${noun} po terminie` : `za ${abs} ${noun}`;
}

export const shiftPath = (reviewId: string, changeIndex: number) =>
  `/przesuniecie-terminu?ocena=${reviewId}&zmiana=${changeIndex}`;

export type ShiftEntry = {
  reviewId: string;
  changeIndex: number;
  employeeName: string;
  currentDueDate: string;
};

export type TodoItem =
  | { kind: "review"; date: string | null; row: DashboardRow }
  | { kind: "shift"; date: string | null; shift: ShiftEntry };

export function buildTodo(
  todo: readonly DashboardRow[],
  shifts: readonly ShiftEntry[],
): TodoItem[] {
  const items: TodoItem[] = [
    ...todo.map((row): TodoItem => ({
      kind: "review",
      date: row.dueDate,
      row,
    })),
    ...shifts.map((shift): TodoItem => ({
      kind: "shift",
      date: shift.currentDueDate,
      shift,
    })),
  ];
  return items.sort((a, b) => byDeadline(a.date, b.date));
}
