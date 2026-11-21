import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Card } from "../../components/ui/Card";
import { GraphView } from "./GraphView";
import { readTables, type TableInfo } from "./introspect";
import {
  EXAMPLES,
  SOURCES,
  STAGES,
  fieldSource,
  type SourceId,
} from "./metadata";

const VIEWS = [
  { id: "graf", label: "Graf relacji" },
  { id: "proces", label: "Proces" },
  { id: "zrodla", label: "Źródła danych" },
  { id: "przyklady", label: "Przykłady" },
] as const;

function ProcessView() {
  return (
    <ol className="space-y-2">
      {STAGES.map((stage, i) => (
        <li key={stage.id}>
          <Card className="space-y-1 text-sm">
            <p className="font-medium">
              {i + 1}. {stage.label}{" "}
              <span className="font-mono text-xs text-slate-600">
                ({stage.id})
              </span>
            </p>
            <p className="text-slate-600">
              Kto: {stage.actor} · Podstawa: {stage.basis}
            </p>
            <p className="text-slate-600">
              Zapisuje do:{" "}
              <span className="font-mono">{stage.writes.join(", ")}</span>
            </p>
          </Card>
          {i < STAGES.length - 1 && (
            <p aria-hidden="true" className="py-1 text-center text-slate-600">
              ↓
            </p>
          )}
        </li>
      ))}
      <li className="text-sm text-slate-600">
        Uwzględniony sprzeciw z decyzją „redo” wraca do etapu „evaluation” z{" "}
        <code>round: 2</code> (art. 83 ust. 4). Zamknięta ocena otwiera kolejny
        cykl (<code>previousReviewId</code>).
      </li>
    </ol>
  );
}

function SourcesView({ tables }: { tables: TableInfo[] }) {
  const bySource = useMemo(() => {
    const map = new Map<SourceId, string[]>();
    for (const table of tables) {
      for (const field of table.fields) {
        const source = fieldSource(table.name, field.name);
        map.set(source, [
          ...(map.get(source) ?? []),
          `${table.name}.${field.name}`,
        ]);
      }
    }
    return map;
  }, [tables]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(SOURCES) as SourceId[]).map((id) => (
        <Card key={id} className="space-y-2 text-sm">
          <h2 className="text-base font-bold">{SOURCES[id].label}</h2>
          <p className="text-slate-600">{SOURCES[id].hint}</p>
          <p className="font-mono text-xs break-words text-slate-700">
            {(bySource.get(id) ?? []).join(", ") || "brak pól"}
          </p>
        </Card>
      ))}
    </div>
  );
}

function ExamplesView() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Przykładowe dokumenty (dane fikcyjne). Wartości w nawiasach ostrych to
        odwołania do innych tabel.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(EXAMPLES).map(([table, doc]) => (
          <Card key={table} className="space-y-2">
            <h2 className="font-mono text-base font-bold">{table}</h2>
            <pre className="overflow-x-auto text-xs">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DevPage() {
  const tables = useMemo(() => readTables(), []);
  const [params, setParams] = useSearchParams();
  const current =
    VIEWS.find((view) => view.id === params.get("widok"))?.id ?? "graf";
  return (
    // The layout caps content at max-w-3xl; a graph needs the full window width.
    <section
      aria-label="Model domeny (dev)"
      className="relative left-1/2 w-[calc(100vw-2rem)] max-w-7xl -translate-x-1/2 space-y-4"
    >
      <h1 className="text-2xl font-bold tracking-tight">Model domeny (dev)</h1>
      <p className="text-sm text-slate-600">
        {tables.length} tabel z <code>convex/schema.ts</code>, czytanych na żywo
        ze schematu. Strona dla zespołu, nie dla użytkowników.
      </p>
      <nav aria-label="Widoki modelu domeny" className="flex flex-wrap gap-2">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={current === view.id}
            onClick={() => setParams({ widok: view.id })}
            className={`rounded-md border px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              current === view.id
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 text-slate-900 hover:bg-slate-50"
            }`}
          >
            {view.label}
          </button>
        ))}
      </nav>
      {current === "graf" && <GraphView tables={tables} />}
      {current === "proces" && <ProcessView />}
      {current === "zrodla" && <SourcesView tables={tables} />}
      {current === "przyklady" && <ExamplesView />}
    </section>
  );
}
