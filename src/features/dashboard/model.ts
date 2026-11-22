import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { formatShortWithWeekday, today } from "../../lib/format";
import { plural } from "../../lib/plural";
import { canSend, type PersonPlan } from "../handover/plan";

export type DashboardRow = FunctionReturnType<
  typeof api.reviews.queries.dashboard
>[number];

export const SOON_DAYS = 7;

const WAITING_STAGES = new Set<DashboardRow["stage"]>([
  "objection_window",
  "objection",
]);

export const isWaiting = (row: DashboardRow) =>
  WAITING_STAGES.has(row.stage) ||
  (row.stage === "signing" && row.evaluatorSigned);

export const byDeadline = (a: string | null, b: string | null) =>
  (a ?? "9999-12-31").localeCompare(b ?? "9999-12-31");

const TODO_STAGES = new Set<DashboardRow["stage"]>([
  "opening",
  "evaluation",
  "writing",
]);

export const isTodo = (row: DashboardRow) =>
  TODO_STAGES.has(row.stage) ||
  (row.stage === "signing" && !row.evaluatorSigned);

export function splitRows(rows: readonly DashboardRow[]) {
  const todo = rows
    .filter(isTodo)
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

export const conversationPath = (
  row: DashboardRow,
  kind: "rozpoczynajaca" | "oceniajaca" | "biezaca",
) => `/rozmowy?pracownik=${row.employeeId}&rodzaj=${kind}`;

export function actionFor(row: DashboardRow): RowAction {
  if (row.stage === "opening" || row.stage === "evaluation") {
    const kind = row.stage === "opening" ? "rozpoczynajaca" : "oceniajaca";
    return {
      label: "Przygotuj rozmowę",
      srSuffix: `: ${row.employeeName}`,
      to: conversationPath(row, kind),
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
  const noun = plural(abs, { one: "dzień", few: "dni", many: "dni" });
  return days < 0 ? `${abs} ${noun} po terminie` : `za ${abs} ${noun}`;
}

export const shiftPath = (reviewId: string, changeIndex: number) =>
  `/przesuniecie-terminu?ocena=${reviewId}&zmiana=${changeIndex}`;

export type ShiftEntry = {
  reviewId: string;
  changeIndex: number;
  employeeName: string;
  currentDueDate: string;
  createdAt: number;
};

export type NoticeEntry = {
  reviewId: string;
  changeIndex: number;
  employeeName: string;
  previousDate: string;
  newDate: string;
  rejected: boolean;
};

export const formalGaps = (count: number) =>
  `${count} ${plural(count, {
    one: "brak formalny",
    few: "braki formalne",
    many: "braków formalnych",
  })}`;

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

const ROZP_ISAP =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20160000470";

export type StageNote = {
  text: string;
  basis?: { label: string; ariaLabel: string; href: string };
};

export function stageNote(row: DashboardRow): StageNote | null {
  if (row.stage === "opening") {
    return {
      text: `Najpóźniej ${RULES_2016.openingDays} dni po poprzedniej ocenie.`,
      basis: {
        label: "§ 7",
        ariaLabel: "§ 7 rozporządzenia w sprawie ocen okresowych",
        href: `${ROZP_ISAP}#par-7`,
      },
    };
  }
  if (row.stage === "objection_window") {
    return {
      text: `Pracownik ma ${RULES_2016.objectionDays} dni na sprzeciw.`,
    };
  }
  return null;
}

export const shortDate = (iso: string) =>
  formatShortWithWeekday(iso).replace(/\.\d{4}$/, "");

export function daysUntil(iso: string, now: Date = today()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - start) / 86_400_000);
}

export type TableAction = { label: string; to: string };

export function tableAction(row: DashboardRow): TableAction {
  if (isWaiting(row)) return { label: "Podgląd", to: previewPath(row) };
  const { label, to } = actionFor(row);
  return {
    label: label === "Kontynuuj ocenę" ? "Kontynuuj" : "Przygotuj",
    to,
  };
}

export type HandoverSummary = {
  count: number;
  dueDate: string | null;
  daysLeft: number | null;
};

export function handoverSummary(
  plan: readonly PersonPlan[],
): HandoverSummary | null {
  const pending = plan.filter(canSend);
  if (pending.length === 0) return null;
  const dueDate =
    pending
      .flatMap((p) => (p.dueDate ? [p.dueDate] : []))
      .sort()
      .at(0) ?? null;
  return {
    count: pending.length,
    dueDate,
    daysLeft: dueDate ? daysUntil(dueDate) : null,
  };
}

export const handoverCount = (count: number) =>
  `${count} ${plural(count, { one: "osoba", few: "osoby", many: "osób" })} z Twojego zespołu`;
