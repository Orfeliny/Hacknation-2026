const STEPS = [
  { stage: "opening", label: "Rozmowa rozpoczynająca" },
  { stage: "observation", label: "Okres oceny" },
  { stage: "evaluation", label: "Rozmowa oceniająca" },
  { stage: "writing", label: "Sporządzenie oceny" },
  { stage: "signing", label: "Podpisy" },
  { stage: "objection_window", label: "Zapoznanie i sprzeciw" },
] as const;

function currentStepIndex(stage: string) {
  const stepStage = stage === "objection" ? "objection_window" : stage;
  return Math.max(
    STEPS.findIndex((s) => s.stage === stepStage),
    stage === "closed" ? STEPS.length - 1 : 0,
  );
}

export function StageNav({ stage }: { stage: string }) {
  const current = currentStepIndex(stage);
  return (
    <div className="border-border rounded-lg border bg-white px-5 py-4">
      <ol aria-label="Etapy oceny" className="grid grid-cols-6 gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s.stage}
            aria-current={i === current ? "step" : undefined}
            className={
              i === current
                ? "text-primary font-bold"
                : i < current
                  ? "text-success font-semibold"
                  : "text-muted"
            }
          >
            {i < current && <span aria-hidden="true">✓ </span>}
            {i + 1}. {s.label}
            {i < current && <span className="sr-only"> (zakończony)</span>}
            {i > current && <span className="sr-only"> (do zrobienia)</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
