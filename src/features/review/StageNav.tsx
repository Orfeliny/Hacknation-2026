import { formatDate } from "../../lib/format";
import type { ReviewView } from "./types";

type Step = { label: string; hint: string };

function stepIndex(stage: ReviewView["review"]["stage"]): number {
  switch (stage) {
    case "opening":
      return 1;
    case "observation":
      return 2;
    case "evaluation":
      return 3;
    case "writing":
      return 4;
    case "signing":
      return 5;
    case "objection_window":
    case "objection":
      return 6;
    default:
      return 8;
  }
}

function buildSteps(view: ReviewView): Step[] {
  const { review } = view;
  const partOne = (review.signatures ?? []).find((s) => s.scope === "part_one");
  const expected = view.criteria.filter((c) => c.expected).length;
  const rated = review.ratings?.length ?? 0;
  const extra = review.additionalCriteria?.length ?? 0;
  return [
    {
      label: "Kryteria",
      hint: `Arkusz ${review.sheet ?? "?"}, ${extra} dodatkowe`,
    },
    {
      label: "Rozmowa rozpoczynająca",
      hint: partOne
        ? `Potwierdzone ${formatDate(partOne.signedAt)}`
        : review.openingConversationDate
          ? `Odbyta ${formatDate(review.openingConversationDate)}`
          : "Wyznacz kryteria",
    },
    {
      label: "Obserwacja",
      hint:
        review.periodStart && review.periodEnd
          ? `${formatDate(review.periodStart)}–${formatDate(review.periodEnd)}`
          : "Okres oceny",
    },
    {
      label: "Rozmowa oceniająca",
      hint: review.evaluationConversationDate
        ? `Odbyta ${formatDate(review.evaluationConversationDate)}`
        : "Do przeprowadzenia",
    },
    { label: "Sporządzenie", hint: `Teraz: ${rated} z ${expected} kryteriów` },
    { label: "Zapoznanie", hint: "Potwierdza pracownik" },
    { label: "Sprzeciw", hint: "7 dni na wniesienie" },
    { label: "Zamknięta", hint: "W aktach" },
  ];
}

export function StageNav({ view }: { view: ReviewView }) {
  const current = stepIndex(view.review.stage);
  const steps = buildSteps(view);
  return (
    <nav
      aria-label="Etapy oceny"
      className="border-border overflow-x-auto rounded-lg border bg-white px-5 py-4"
    >
      <ol className="grid min-w-[960px] grid-cols-8 gap-2 text-sm">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.label}
              aria-current={active ? "step" : undefined}
              className={`flex flex-col gap-1 ${active ? "bg-surface-muted rounded-md pl-2.5" : ""}`}
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
                {done && <span aria-hidden="true">✓</span>}
                {s.label}
                <span className="sr-only">
                  {done ? " (zakończony)" : active ? "" : " (do zrobienia)"}
                </span>
              </span>
              <span className={active ? "text-primary" : "text-muted"}>
                {s.hint}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
