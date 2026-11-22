import { useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RouteLink, useRouteRegistered } from "../../app/index";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { fullName, type CardData } from "./card";
import { Entries } from "./Entries";
import { History } from "./History";
import { NewCycle } from "./NewCycle";
import { PersonalData } from "./PersonalData";
import { ShiftHistory } from "./ShiftHistory";
import { Staffing } from "./Staffing";

const HR_OFFICE_PATH = "/kadry";
const ASSIGN_PATH = "/kadry/przypisanie";

function CardView({
  card,
  employeeId,
}: {
  card: CardData;
  employeeId: Id<"employees">;
}) {
  const [adding, setAdding] = useState(false);
  const name = fullName(card.employee);
  const hrOffice = useRouteRegistered(HR_OFFICE_PATH);
  const current = card.reviews.find((r) => r.stage !== "closed");
  return (
    <>
      <PageTitle>{`Karta pracownika — ${name}`}</PageTitle>
      {hrOffice ? (
        <nav aria-label="Ścieżka nawigacji" className="text-muted mb-4 text-sm">
          <Link to={HR_OFFICE_PATH}>Pulpit</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Karta pracownika: {name}</span>
        </nav>
      ) : null}
      <PageHeader
        title={name}
        description={`${card.employee.position} · ${card.employee.unit}${card.supervisor ? ` · oceniający: ${fullName(card.supervisor)}` : ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdding(true)}>
              Dodaj nieobecność
            </Button>
            <RouteLink
              to={ASSIGN_PATH}
              className="border-primary text-primary hover:bg-surface-muted rounded-md border px-4 font-semibold"
            >
              Zmień oceniającego
            </RouteLink>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <PersonalData card={card} employeeId={employeeId} />
          <Staffing
            employeeId={employeeId}
            events={card.staffingEvents}
            dueDate={current?.dueDate}
            adding={adding}
            onAddingChange={setAdding}
          />
          <ShiftHistory employeeId={employeeId} />
          <NewCycle name={name} />
          <Entries card={card} employeeId={employeeId} />
        </div>
        <aside aria-label="Oceny" className="space-y-6">
          <History card={card} />
        </aside>
      </div>
    </>
  );
}

function Workspace({ employeeId }: { employeeId: Id<"employees"> }) {
  const role = useDemoRole();
  const card = useQuery(api.employees.queries.card, {
    actor: { role },
    employeeId,
  });
  if (card === undefined) return <p>Ładowanie karty pracownika…</p>;
  if (card === null) return <NotFound />;
  return <CardView card={card} employeeId={employeeId} />;
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <>
      <PageTitle>Karta pracownika</PageTitle>
      <PageHeader title="Karta pracownika" />
      {children}
    </>
  );
}

function NotFound() {
  return (
    <Notice>
      <Card>
        Nie znaleziono pracownika albo ta rola nie ma do niego dostępu. Wróć do
        listy w Panelu kadr.
      </Card>
    </Notice>
  );
}

class CardErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <Notice>
          <StatusAlert tone="danger">
            Nie udało się wczytać karty. Sprawdź adres albo wróć do listy
            pracowników.
          </StatusAlert>
        </Notice>
      );
    }
    return this.props.children;
  }
}

function KnownEmployee({ employeeId }: { employeeId: string }) {
  const role = useDemoRole();
  const team = useQuery(api.employees.queries.team, { actor: { role } });
  if (team === undefined) return <p>Ładowanie karty pracownika…</p>;
  if (!team.some((e) => e._id === employeeId)) return <NotFound />;
  return (
    <CardErrorBoundary key={employeeId}>
      <Workspace employeeId={employeeId as Id<"employees">} />
    </CardErrorBoundary>
  );
}

function Content() {
  const role = useDemoRole();
  const [params] = useSearchParams();
  const employeeId = params.get("pracownik");
  if (role !== "hr" && role !== "admin") {
    return (
      <Notice>
        <Card>
          Ten widok jest dla roli „Kadry”. Wybierz ją w nagłówku, żeby zobaczyć
          kartę pracownika.
        </Card>
      </Notice>
    );
  }
  if (!employeeId) {
    return (
      <Notice>
        <Card>
          Nie wybrano pracownika. Otwórz kartę z listy w Panelu kadr albo z
          widoku przypisania oceniającego.
        </Card>
      </Notice>
    );
  }
  return <KnownEmployee employeeId={employeeId} />;
}

export function EmployeeCardPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section>
      {online ? (
        <Content />
      ) : (
        <Notice>
          <Card>Widok wymaga połączenia z backendem (tryb offline).</Card>
        </Notice>
      )}
    </section>
  );
}
