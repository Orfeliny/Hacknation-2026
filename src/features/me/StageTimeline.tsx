import { RULES_2016 } from "../../../convex/rules/pack2016";
import { formatDate } from "../../lib/format";
import { plural } from "../../lib/plural";
import type { ReviewStageId } from "./stages";
import { TIMELINE, timelineIndex } from "./stages";

export type TimelineFacts = {
  criteriaCount?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueDate?: string | null;
};

export function CheckMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function monthsBetween(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return Math.max(
    0,
    (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1,
  );
}

function subLabel(index: number, facts: TimelineFacts): string {
  switch (index) {
    case 0:
      return facts.criteriaCount
        ? `${facts.criteriaCount} ${plural(facts.criteriaCount, { one: "kryterium", few: "kryteria", many: "kryteriów" })}`
        : "Ustalone";
    case 1:
      return "Potwierdź kryteria";
    case 2: {
      if (!facts.periodStart || !facts.periodEnd) return "Okres oceny";
      const months = monthsBetween(facts.periodStart, facts.periodEnd);
      return `${months} ${plural(months, { one: "miesiąc", few: "miesiące", many: "miesięcy" })}`;
    }
    case 3:
      return "Przed sporządzeniem";
    case 4:
      return facts.dueDate
        ? `Do ${formatDate(`${facts.dueDate}T12:00:00`)}`
        : "Pisze oceniający";
    case 5:
      return "Potwierdzasz Ty";
    case 6:
      return `${RULES_2016.objectionDays} dni, jeśli zechcesz`;
    default:
      return "W aktach";
  }
}

export function StageTimeline({
  stage,
  facts = {},
}: {
  stage: ReviewStageId;
  facts?: TimelineFacts;
}) {
  const current = timelineIndex(stage);
  return (
    <nav
      aria-label="Etapy oceny"
      className="border-border overflow-x-auto rounded-xl border bg-white px-5 py-4"
    >
      <ol className="grid min-w-[900px] grid-cols-8 gap-2 text-sm">
        {TIMELINE.map((step, index) => {
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li
              key={step.label}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex flex-col gap-1 ${state === "current" ? "bg-surface-muted rounded-md py-1 pl-2.5" : ""}`}
            >
              <span
                className={`flex items-center gap-1.5 ${
                  state === "done"
                    ? "text-success font-bold"
                    : state === "current"
                      ? "text-primary font-bold"
                      : "text-muted font-semibold"
                }`}
              >
                {state === "done" && (
                  <>
                    <CheckMark />
                    <span className="sr-only">Zakończony: </span>
                  </>
                )}
                {step.label}
              </span>
              <span
                className={state === "current" ? "text-primary" : "text-muted"}
              >
                {state === "current"
                  ? `Teraz: ${step.now}`
                  : subLabel(index, facts)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
