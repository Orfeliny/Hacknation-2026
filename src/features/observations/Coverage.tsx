import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";

export type CoverageData = FunctionReturnType<
  typeof api.observations.queries.coverage
>;

export function Coverage({
  coverage,
  viewer,
}: {
  coverage: CoverageData;
  viewer: "supervisor" | "hr";
}) {
  if (coverage === null) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-ink text-[22px] font-bold">Pokrycie kryteriów</h2>
        <p className="text-muted">
          Pracownik nie ma otwartej oceny z arkuszem, więc nie ma kryteriów do
          pokrycia.
        </p>
      </Card>
    );
  }
  const max = Math.max(1, ...coverage.criteria.map((c) => c.count));
  const sorted = [...coverage.criteria].sort((a, b) => b.count - a.count);
  const missing = coverage.missing.join(", ");
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-ink text-[22px] font-bold">Pokrycie kryteriów</h2>
      <ul className="flex flex-col gap-3">
        {sorted.map((c) => (
          <li key={c.id} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2">
              <span>{c.name}</span>
              <strong>{c.count === 0 ? "0 wpisów" : c.count}</strong>
            </div>
            <div
              aria-hidden="true"
              className={`h-1.5 rounded ${c.count === 0 ? "border-border border border-dashed" : "bg-surface-muted"}`}
            >
              <div
                className="bg-muted h-1.5 rounded"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-muted text-sm">
        {coverage.missing.length === 0
          ? "Każde kryterium ma co najmniej jeden wpis."
          : viewer === "hr"
            ? `Przełożony nie ma wpisów o: ${missing}.`
            : `Bez obserwacji trudno uzasadnić ocenę. Przed rozmową oceniającą dodaj wpis o: ${missing}.`}
      </p>
    </Card>
  );
}
