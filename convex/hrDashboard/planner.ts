import type { Doc, Id } from "../_generated/dataModel";
import { addDays, compareDates, daysBetween } from "../rules/dates";
import { computeDeadlines, type Deadline } from "../rules/deadlines";
import { RULES_2016, type RulesPack } from "../rules/pack2016";

export const UPCOMING_WINDOW_DAYS = 14;

export type PlannedReminder = {
  recipientId: Id<"employees">;
  reviewId: Id<"reviews">;
  kind: "upcoming" | "overdue";
  stage: string;
  dueDate: string;
  message: string;
};

type Review = Doc<"reviews">;

// Start of the cycle: the previous review's closing day, else the start of indefinite employment.
export function cycleStartOf(
  review: Review,
  employee: Doc<"employees">,
  previous: Review | null,
): string | null {
  if (previous?.closedAt)
    return new Date(previous.closedAt).toISOString().slice(0, 10);
  return review.periodStart ?? employee.indefiniteEmploymentSince ?? null;
}

export function deadlinesFor(
  review: Review,
  employee: Doc<"employees">,
  previous: Review | null,
  rules: RulesPack = RULES_2016,
): Deadline[] {
  const cycleStart = cycleStartOf(review, employee, previous);
  if (!cycleStart) return [];
  const deadlines = computeDeadlines(
    {
      cycleStart,
      previousResult: previous?.overallResult,
      overrideReviewDate: review.dueDate,
      absences: (employee.staffingEvents ?? [])
        .filter((e) => e.kind === "long_absence" && e.to)
        .map((e) => ({ from: e.from, to: e.to! })),
    },
    rules,
  );
  return deadlines;
}

function windowState(
  due: string,
  today: string,
): "upcoming" | "overdue" | null {
  if (compareDates(today, due) > 0) return "overdue";
  if (compareDates(today, addDays(due, -UPCOMING_WINDOW_DAYS)) >= 0)
    return "upcoming";
  return null;
}

function daysLeft(due: string, today: string): string {
  const n = daysBetween(today, due);
  if (n === 0) return "Dziś mija termin";
  return n === 1 ? "Został 1 dzień" : `Zostało ${n} dni`;
}

// Which reminders a review needs today. Pure, so the cron and the tests share it.
export function planReminders(
  review: Review,
  deadlines: Deadline[],
  today: string,
  // Overdue terms are the most common error in practice, so HR gets a copy (KPRM interviews).
  hrRecipients: Id<"employees">[] = [],
): PlannedReminder[] {
  const opening = deadlines.find((d) => d.kind === "opening");
  const due = deadlines.find((d) => d.kind === "review");
  const out: PlannedReminder[] = [];
  const add = (
    recipientId: Id<"employees">,
    kind: "upcoming" | "overdue",
    stage: string,
    dueDate: string,
    message: string,
  ) =>
    out.push({
      recipientId,
      reviewId: review._id,
      kind,
      stage,
      dueDate,
      message,
    });

  if ((review.stage === "setup" || review.stage === "opening") && opening) {
    const state = windowState(opening.date, today);
    if (state) {
      add(
        review.evaluatorId,
        state,
        "opening",
        opening.date,
        state === "overdue"
          ? `Minął termin wyznaczenia kryteriów i rozmowy rozpoczynającej (${opening.date}).`
          : `${daysLeft(opening.date, today)} na wyznaczenie kryteriów i rozmowę rozpoczynającą (do ${opening.date}).`,
      );
      if (state === "overdue") {
        for (const hr of hrRecipients) {
          add(
            hr,
            state,
            "opening",
            opening.date,
            `Zaległe wyznaczenie kryteriów (termin ${opening.date}).`,
          );
        }
      }
    }
  }
  if (
    (review.stage === "observation" ||
      review.stage === "evaluation" ||
      review.stage === "writing") &&
    due
  ) {
    const state = windowState(due.date, today);
    if (state) {
      const text =
        state === "overdue"
          ? `Minął termin sporządzenia oceny okresowej (${due.date}).`
          : `${daysLeft(due.date, today)} do terminu sporządzenia oceny okresowej (${due.date}).`;
      add(review.evaluatorId, state, "review", due.date, text);
      add(review.employeeId, state, "review", due.date, text);
      if (state === "overdue") {
        for (const hr of hrRecipients) {
          add(
            hr,
            state,
            "review",
            due.date,
            `Zaległa ocena okresowa (termin ${due.date}).`,
          );
        }
      }
    }
  }
  return out;
}
