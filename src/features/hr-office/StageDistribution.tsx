import {
  closedLabel,
  STAGE_COLORS,
  STAGE_LABELS,
  STAGE_ORDER,
  type Stage,
} from "./labels";
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
  const closed = counts.get("closed") ?? 0;
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
          {open} w toku · {closed} {closedLabel(closed)}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="flex h-4 gap-0.5 overflow-hidden rounded-lg"
      >
        {STAGE_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((stage) => (
          <div
            key={stage}
            style={{ flex: counts.get(stage), background: STAGE_COLORS[stage] }}
          />
        ))}
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-4 gap-y-2">
        {STAGE_ORDER.map((stage) => (
          <li key={stage} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 flex-none rounded-[3px]"
              style={{ background: STAGE_COLORS[stage] }}
            />
            {STAGE_LABELS[stage]}
            <strong>{counts.get(stage) ?? 0}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
