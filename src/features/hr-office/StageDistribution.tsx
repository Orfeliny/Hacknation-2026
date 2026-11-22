import { STAGE_LABELS, STAGE_ORDER, type Stage } from "./labels";
import type { BoardRow } from "./types";

export function StageDistribution({
  board,
  objectionsAtDirector,
}: {
  board: readonly BoardRow[];
  objectionsAtDirector: number;
}) {
  const counts = new Map<Stage, number>();
  for (const row of board) {
    counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
  }
  counts.set("objection", objectionsAtDirector);
  const open = STAGE_ORDER.filter((s) => s !== "closed").reduce(
    (sum, s) => sum + (counts.get(s) ?? 0),
    0,
  );

  return (
    <section aria-labelledby="h-etapy" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-etapy" className="text-xl font-bold">
          Gdzie są oceny
        </h2>
        <span className="text-muted">
          {open} w toku · {counts.get("closed") ?? 0} zamkniętych
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-x-8">
        {STAGE_ORDER.map((stage) => (
          <li
            key={stage}
            className="border-divider flex justify-between border-b py-2"
          >
            <span>{STAGE_LABELS[stage]}</span>
            <strong>{counts.get(stage) ?? 0}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
