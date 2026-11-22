import type { ReviewStageId } from "./stages";
import { TIMELINE, timelineIndex } from "./stages";

export function StageTimeline({ stage }: { stage: ReviewStageId }) {
  const current = timelineIndex(stage);
  return (
    <nav
      aria-label="Etapy oceny"
      className="border-border overflow-x-auto rounded-xl border bg-white px-5 py-4"
    >
      <ol className="flex gap-4">
        {TIMELINE.map((step, index) => {
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li
              key={step.label}
              aria-current={state === "current" ? "step" : undefined}
              className="flex min-w-28 flex-1 flex-col gap-0.5"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    state === "done"
                      ? "border-success bg-success text-white"
                      : state === "current"
                        ? "border-primary bg-primary text-white"
                        : "border-border text-muted bg-white"
                  }`}
                >
                  {state === "done" ? "✓" : index + 1}
                </span>
                <span
                  className={`text-ink ${state === "current" ? "font-bold" : "font-semibold"}`}
                >
                  {step.label}
                </span>
              </span>
              <span className="text-muted pl-8 text-sm">
                {state === "done" && (
                  <span className="sr-only">Zakończony. </span>
                )}
                {state === "current" && <strong>Teraz: </strong>}
                {step.hint}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
