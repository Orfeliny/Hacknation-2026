import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";

export type CoverageData = FunctionReturnType<
  typeof api.observations.queries.coverage
>;

export function Coverage({ coverage }: { coverage: CoverageData }) {
  if (coverage === null) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-ink text-xl font-bold">Pokrycie kryteriów</h2>
        <p className="text-muted">
          Pracownik nie ma otwartej oceny z arkuszem, więc nie ma kryteriów do
          pokrycia.
        </p>
      </Card>
    );
  }
  const max = Math.max(1, ...coverage.criteria.map((c) => c.count));
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-ink text-xl font-bold">Pokrycie kryteriów</h2>
      <ul className="flex flex-col gap-3">
        {coverage.criteria.map((c) => (
          <li key={c.id} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2">
              <span>{c.name}</span>
              <strong>{c.count === 0 ? "0 wpisów" : c.count}</strong>
            </div>
            <div aria-hidden="true" className="bg-surface-muted h-2 rounded">
              <div
                className="bg-primary h-2 rounded"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {coverage.missing.length > 0 ? (
        <StatusAlert tone="warning" live={false}>
          Bez obserwacji trudno uzasadnić ocenę. Przed rozmową oceniającą dodaj
          wpis o: {coverage.missing.join(", ")}.
        </StatusAlert>
      ) : (
        <StatusAlert tone="success" live={false}>
          Każde kryterium ma co najmniej jeden wpis.
        </StatusAlert>
      )}
    </Card>
  );
}
