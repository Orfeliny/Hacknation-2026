import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { DecisionButtons } from "./ObjectionPanel";

function List() {
  const role = useDemoRole();
  const allowed = role === "director" || role === "hr" || role === "admin";
  const rows = useQuery(
    api.objections.queries.listForDirector,
    allowed ? { actor: { role } } : "skip",
  );
  if (!allowed) {
    return (
      <p className="text-sm text-slate-600">
        Sprzeciwy rozpatruje dyrektor generalny. Wybierz w nagłówku rolę
        „dyrektor”, żeby je zobaczyć.
      </p>
    );
  }
  if (rows === undefined) return <p>Ładowanie sprzeciwów…</p>;
  if (rows.length === 0) return <p>Brak sprzeciwów do rozpatrzenia.</p>;
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.reviewId}>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">
              {row.employeeName}
              {row.position ? `, ${row.position}` : ""}
            </h2>
            <p className="text-sm text-slate-600">
              Wniesiono {new Date(row.filedAt).toLocaleDateString("pl-PL")}
              {row.round > 1
                ? `, ocena po raz drugi (podejście ${row.round})`
                : ""}
              . Termin decyzji: {row.decisionDeadline}
              {row.overdue ? " (termin minął)" : ""}.
            </p>
            <p className="text-sm whitespace-pre-line">{row.text}</p>
            <Link
              className="text-sm text-indigo-700 underline"
              to={`/oceny?ocena=${encodeURIComponent(row.reviewId)}`}
            >
              Zobacz ocenę
            </Link>
            {role === "director" ? (
              <DecisionButtons reviewId={row.reviewId} />
            ) : (
              <p className="text-sm text-slate-600">
                Decyzję podejmuje dyrektor generalny.
              </p>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function ObjectionsPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-4">
      <title>Sprzeciwy</title>
      <h1 className="text-2xl font-bold tracking-tight">Sprzeciwy od ocen</h1>
      {online ? (
        <List />
      ) : (
        <p className="text-sm text-slate-600">
          Tryb offline: lista sprzeciwów wymaga połączenia z backendem.
        </p>
      )}
    </section>
  );
}
