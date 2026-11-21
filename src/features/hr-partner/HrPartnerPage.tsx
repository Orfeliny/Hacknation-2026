import { useQuery } from "convex/react";
import { Component, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { AskPanel } from "./AskPanel";
import { errorText } from "./errors";
import { SIGNAL_LABEL, labelOf } from "./labels";
import { SignalItem } from "./SignalItem";

class RoleBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: errorText(error, "Nie można wyświetlić tego widoku."),
    };
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return (
      <p
        role="alert"
        className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
      >
        {this.state.message}
      </p>
    );
  }
}

function Disclaimer() {
  return (
    <p className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm">
      Sygnały to podpowiedź, a nie diagnoza. Liczą je jawne reguły na podstawie
      Twoich obserwacji i zdarzeń kadrowych. Ocenę pracownika zawsze ustala
      przełożony, a AI jej nie proponuje.
    </p>
  );
}

function TeamView() {
  const actor = { role: useDemoRole() };
  const data = useQuery(api.hrPartner.queries.listForSupervisor, { actor });
  if (data === undefined) return <p>Ładowanie zespołu…</p>;
  const team = data.team.map((row) => ({
    id: row.employee.id,
    name: `${row.employee.firstName} ${row.employee.lastName}`,
  }));
  return (
    <div className="space-y-4">
      <Disclaimer />
      {data.team.length === 0 ? (
        <p>Nie masz przypisanych pracowników.</p>
      ) : (
        data.team.map((row) => (
          <Card key={row.employee.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">
                {row.employee.firstName} {row.employee.lastName}
              </h2>
              <p className="text-sm text-slate-600">{row.employee.position}</p>
            </div>
            {row.signals.length === 0 ? (
              <p className="text-sm text-slate-600">Brak sygnałów.</p>
            ) : (
              <ul className="space-y-2">
                {row.signals.map((signal) => (
                  <SignalItem
                    key={`${signal.kind}|${signal.reason}`}
                    employeeId={row.employee.id}
                    signal={signal}
                  />
                ))}
              </ul>
            )}
          </Card>
        ))
      )}
      <AskPanel team={team} />
    </div>
  );
}

function HrSummaryView() {
  const actor = { role: useDemoRole() };
  const data = useQuery(api.hrPartner.queries.hrSummary, { actor });
  if (data === undefined) return <p>Ładowanie zestawienia…</p>;
  return (
    <Card className="space-y-3">
      <p className="text-sm text-slate-600">
        Zestawienie zbiorcze dla {data.employees} pracowników na dzień{" "}
        {data.today}. Nie zawiera nazwisk, powodów ani treści obserwacji.
      </p>
      {data.perKind.length === 0 ? (
        <p>Brak sygnałów w urzędzie.</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Sygnały według rodzaju</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="pb-1">
                Rodzaj sygnału
              </th>
              <th scope="col" className="pb-1">
                Sygnały
              </th>
              <th scope="col" className="pb-1">
                Pracownicy
              </th>
            </tr>
          </thead>
          <tbody>
            {data.perKind.map((row) => (
              <tr key={row.kind} className="border-t border-slate-200">
                <th scope="row" className="py-1 text-left font-normal">
                  {labelOf(SIGNAL_LABEL, row.kind)}
                </th>
                <td>{row.signals}</td>
                <td>{row.employees}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export function HrPartnerPage() {
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-4">
      <title>HR partner</title>
      <h1 className="text-2xl font-bold tracking-tight">HR partner</h1>
      {!online ? (
        <p>
          HR partner wymaga połączenia z backendem Convex. Uruchom{" "}
          <code>npm run dev</code>, aby go połączyć.
        </p>
      ) : role === "employee" ? (
        <p>HR partner jest dla przełożonych. Wybierz rolę przełożonego.</p>
      ) : (
        <RoleBoundary key={role}>
          {role === "hr" ? <HrSummaryView /> : <TeamView />}
        </RoleBoundary>
      )}
    </section>
  );
}
