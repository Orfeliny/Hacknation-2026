import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Card } from "../../components/ui/Card";
import { readRelations, readTables, type TableInfo } from "./introspect";
import {
  EXAMPLES,
  SOURCES,
  STAGES,
  TABLES,
  fieldSource,
  type SourceId,
} from "./metadata";

const VIEWS = [
  { id: "tabele", label: "Tabele" },
  { id: "relacje", label: "Relacje" },
  { id: "proces", label: "Proces" },
  { id: "zrodla", label: "Źródła danych" },
  { id: "przyklady", label: "Przykłady" },
] as const;

const issueLink = (n: number) => (
  <a
    key={n}
    href={`https://github.com/Orfeliny/Hacknation-2026/issues/${n}`}
    className="text-indigo-700 underline focus-visible:outline-2 focus-visible:outline-indigo-600"
  >
    #{n}
  </a>
);

function SourceBadge({ id }: { id: SourceId }) {
  return (
    <span
      title={SOURCES[id].hint}
      className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700"
    >
      {SOURCES[id].label}
    </span>
  );
}

function TablesView({ tables }: { tables: TableInfo[] }) {
  const [selected, setSelected] = useState(tables[0]?.name ?? "");
  const table = tables.find((t) => t.name === selected);
  const meta = TABLES[selected];
  return (
    <div className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        <span>Tabela</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          {tables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.fields.length} pól)
            </option>
          ))}
        </select>
      </label>
      {table && (
        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{table.name}</h2>
            {meta && (
              <p className="text-sm text-slate-600">
                {meta.purpose} Moduł: <code>convex/{meta.module}/</code>
                {meta.issues.length > 0 && <> · Issues: </>}
                {meta.issues.map((n, i) => (
                  <span key={n}>
                    {i > 0 && ", "}
                    {issueLink(n)}
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Pola tabeli {table.name}</caption>
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4">Pole</th>
                  <th className="py-2 pr-4">Typ</th>
                  <th className="py-2 pr-4">Wymagane</th>
                  <th className="py-2">Skąd</th>
                </tr>
              </thead>
              <tbody>
                {table.fields.map((field) => (
                  <tr
                    key={field.name}
                    className="border-b border-slate-100 align-top"
                  >
                    <td className="py-2 pr-4 font-mono">{field.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs break-all text-slate-700">
                      {field.type}
                    </td>
                    <td className="py-2 pr-4">
                      {field.required ? "tak" : "nie"}
                    </td>
                    <td className="py-2">
                      <SourceBadge id={fieldSource(table.name, field.name)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 text-sm">
            <h3 className="font-medium">Indeksy</h3>
            <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
              {table.indexes.map((index) => (
                <li key={index.name}>
                  {index.name} [{index.fields.join(", ")}]
                </li>
              ))}
              {table.searchIndexes.map((index) => (
                <li key={index.name}>
                  {index.name} (wyszukiwanie po {index.field})
                </li>
              ))}
              {table.indexes.length + table.searchIndexes.length === 0 && (
                <li>brak</li>
              )}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}

function RelationsView({ tables }: { tables: TableInfo[] }) {
  const relations = readRelations(tables);
  const incoming = (name: string) => relations.filter((r) => r.to === name);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Strzałka „→” to pole typu <code>id(...)</code>. Lista jest liczona ze
        schematu, więc zawsze zgadza się z kodem.
      </p>
      {tables.map((table) => {
        const outgoing = relations.filter((r) => r.from === table.name);
        const into = incoming(table.name);
        if (outgoing.length === 0 && into.length === 0) return null;
        return (
          <Card key={table.name} className="space-y-2 text-sm">
            <h2 className="font-mono text-base font-bold">{table.name}</h2>
            {outgoing.length > 0 && (
              <ul className="space-y-1">
                {outgoing.map((r) => (
                  <li key={r.field + r.to}>
                    <span className="font-mono">{r.field}</span> →{" "}
                    <span className="font-mono font-medium">{r.to}</span>
                  </li>
                ))}
              </ul>
            )}
            {into.length > 0 && (
              <p className="text-slate-600">
                Wskazują tu:{" "}
                {into.map((r) => `${r.from}.${r.field}`).join(", ")}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

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
        <code>round: 2</code> (art. 83 ust. 4).
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
    <div className="space-y-4">
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
        Przykładowe dokumenty (dane fikcyjne). Identyfikatory w nawiasach
        ostrych to odwołania do innych tabel.
      </p>
      {Object.entries(EXAMPLES).map(([table, doc]) => (
        <Card key={table} className="space-y-2">
          <h2 className="font-mono text-base font-bold">{table}</h2>
          <pre className="overflow-x-auto text-xs">
            {JSON.stringify(doc, null, 2)}
          </pre>
        </Card>
      ))}
    </div>
  );
}

export default function DevPage() {
  const tables = useMemo(() => readTables(), []);
  const [params, setParams] = useSearchParams();
  const current =
    VIEWS.find((view) => view.id === params.get("widok"))?.id ?? "tabele";
  return (
    <section aria-label="Model danych (dev)" className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Model danych (dev)</h1>
      <p className="text-sm text-slate-600">
        {tables.length} tabel z <code>convex/schema.ts</code>. Strona dla
        zespołu, nie dla użytkowników.
      </p>
      <nav aria-label="Widoki modelu danych" className="flex flex-wrap gap-2">
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
      {current === "tabele" && <TablesView tables={tables} />}
      {current === "relacje" && <RelationsView tables={tables} />}
      {current === "proces" && <ProcessView />}
      {current === "zrodla" && <SourcesView tables={tables} />}
      {current === "przyklady" && <ExamplesView />}
    </section>
  );
}
