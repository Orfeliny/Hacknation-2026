import { STAGE_LABELS } from "../../../convex/reviews/stages";
import type { ReviewStage } from "../../../convex/rules/types";
import { plural } from "../../lib/plural";

const STRIP: readonly ReviewStage[] = [
  "setup",
  "opening",
  "observation",
  "evaluation",
  "writing",
  "signing",
  "objection_window",
  "closed",
];

const OBSERVATIONS = {
  one: "obserwacja",
  few: "obserwacje",
  many: "obserwacji",
};

function stageIndex(stage: ReviewStage): number {
  return STRIP.indexOf(stage === "objection" ? "objection_window" : stage);
}

export function StageStrip({
  stage,
  observationCount,
}: {
  stage: ReviewStage;
  observationCount: number | undefined;
}) {
  const current = stageIndex(stage);
  return (
    <nav
      aria-label="Etapy oceny"
      className="border-border overflow-x-auto rounded-xl border bg-white px-5 py-4"
    >
      <ol className="grid min-w-[60rem] grid-cols-8 gap-2 text-sm">
        {STRIP.map((item, index) => {
          const done = index < current;
          const active = index === current;
          const detail = active
            ? "Teraz"
            : item === "observation" && observationCount !== undefined
              ? `${observationCount} ${plural(observationCount, OBSERVATIONS)}`
              : done
                ? "Zakończony"
                : "";
          return (
            <li
              key={item}
              aria-current={active ? "step" : undefined}
              className={`flex flex-col gap-1 ${active ? "bg-surface-muted rounded-md py-1 pl-2.5" : ""}`}
            >
              <span
                className={`flex items-center gap-1.5 ${
                  active
                    ? "text-primary font-bold"
                    : done
                      ? "text-success font-bold"
                      : "text-muted font-semibold"
                }`}
              >
                {done ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 shrink-0"
                  >
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                ) : null}
                {STAGE_LABELS[item]}
              </span>
              <span className={active ? "text-primary" : "text-muted"}>
                {detail || " "}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
