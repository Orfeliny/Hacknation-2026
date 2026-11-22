import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { isSubjectToReview } from "../../../convex/rules/validateReview";
import { RouteLink, useRouteRegistered } from "../../app/index";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useShiftsForEmployee } from "../../lib/backend/deadlineShift";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate } from "../../lib/format";
import { CORPS_ROLE, ISAP, POSITION_KIND } from "./labels";
import { NewCycle } from "./NewCycle";
import { ShiftHistory } from "./ShiftHistory";
import { Staffing } from "./Staffing";

const HR_OFFICE_PATH = "/kadry";
const ASSIGN_PATH = "/kadry/przypisanie";
const PRINT_PATH = "/druk";
const OBSERVATIONS_PATH = "/obserwacje";

type CardData = NonNullable<
  FunctionReturnType<typeof api.employees.queries.card>
>;

const fullName = (e: { firstName: string; lastName: string }) =>
  `${e.firstName} ${e.lastName}`;

function contractText(employee: CardData["employee"]): string {
  if (employee.corpsRole === "official") {
    return employee.appointmentYear
      ? `Mianowanie, rok ${employee.appointmentYear}`
      : "Mianowanie";
  }
  if (employee.contractTerm === "indefinite") {
    return employee.indefiniteEmploymentSince
      ? `Na czas nieokreślony od ${formatDate(employee.indefiniteEmploymentSince)}`
      : "Na czas nieokreślony";
  }
  if (employee.contractTerm === "fixed_term") return "Na czas określony";
  return "Brak danych";
}

function DueDate({ card, employeeId }: { card: CardData; employeeId: string }) {
  const { data: shifts } = useShiftsForEmployee({
    employeeId: employeeId as Id<"employees">,
  });
  const current = card.reviews.find((r) => r.stage !== "closed");
  if (!current?.dueDate) return <>Brak otwartej oceny</>;
  const applied = shifts?.find(
    (s) =>
      s.status === "approved" &&
      s.noticeSentAt !== undefined &&
      s.newDate === current.dueDate &&
      s.previousDate !== current.dueDate,
  );
  return (
    <>
      <span className="block font-semibold">{formatDate(current.dueDate)}</span>
      {applied ? (
        <span className="text-muted block text-sm">
          Przesunięty z {formatDate(applied.previousDate)}
        </span>
      ) : null}
    </>
  );
}

function PersonalData({
  card,
  employeeId,
}: {
  card: CardData;
  employeeId: string;
}) {
  const { employee } = card;
  const subject = isSubjectToReview(employee);
  const rows: [string, ReactNode][] = [
    [
      "Status w korpusie",
      employee.corpsRole ? CORPS_ROLE[employee.corpsRole] : "Brak danych",
    ],
    ["Umowa", contractText(employee)],
    [
      "Rodzaj stanowiska",
      employee.positionKind
        ? POSITION_KIND[employee.positionKind]
        : "Brak danych",
    ],
    [
      "Podlega ocenie",
      <>
        <span className="flex items-center gap-1 font-semibold">
          {subject ? <Icon name="success" className="size-4" /> : null}
          {subject ? "Tak" : "Nie"}
        </span>
        <span className="text-muted block text-sm">
          Podstawa:{" "}
          <ExternalLink href={`${ISAP}#art-81-ust-1`}>
            art. 81 ust. 1
          </ExternalLink>
        </span>
      </>,
    ],
    ["Termin oceny", <DueDate card={card} employeeId={employeeId} />],
  ];
  return (
    <section aria-labelledby="h-dane">
      <Card>
        <h2 id="h-dane" className="mb-3 text-lg font-bold">
          Dane kadrowe
        </h2>
        <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
          {rows.map(([term, value]) => (
            <div key={term}>
              <dt className="text-muted text-sm">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}

function Entries({ card, employeeId }: { card: CardData; employeeId: string }) {
  const observations = useRouteRegistered(OBSERVATIONS_PATH);
  return (
    <section aria-labelledby="h-wpisy">
      <Card className="space-y-3">
        <h2 id="h-wpisy" className="text-lg font-bold">
          Obserwacje i notatki
        </h2>
        <StatusAlert tone="info" live={false}>
          Kadry widzą oba rodzaje wpisów. Pracownik nie widzi obserwacji
          przełożonego, a przełożony nie widzi notatek pracownika. Każdy wgląd
          kadr zapisujemy w dzienniku zdarzeń.
        </StatusAlert>
        <p>
          Obserwacje prowadzi{" "}
          {card.supervisor ? fullName(card.supervisor) : "oceniający"}.
        </p>
        {observations ? (
          <Link
            className="text-primary inline-flex min-h-11 items-center font-semibold"
            to={`${OBSERVATIONS_PATH}?pracownik=${employeeId}`}
          >
            Otwórz obserwacje: {fullName(card.employee)}
          </Link>
        ) : null}
      </Card>
    </section>
  );
}

const RESULT_LABEL = { positive: "Pozytywna", negative: "Negatywna" } as const;

function History({ card }: { card: CardData }) {
  const print = useRouteRegistered(PRINT_PATH);
  return (
    <section aria-labelledby="h-hist">
      <Card>
        <h2 id="h-hist" className="mb-2 text-lg font-bold">
          Historia ocen
        </h2>
        {card.reviews.length === 0 ? (
          <p>Brak ocen tego pracownika.</p>
        ) : (
          <ul>
            {card.reviews.map((review) => {
              const label =
                review.stage === "closed"
                  ? review.dueDate
                    ? formatDate(review.dueDate)
                    : "Zamknięta ocena"
                  : "Bieżąca ocena";
              return (
                <li
                  key={review._id}
                  className="border-divider border-b py-2 last:border-b-0"
                >
                  <div className="font-semibold">{label}</div>
                  <div className="text-muted text-sm">
                    {review.stage === "closed"
                      ? review.overallResult
                        ? RESULT_LABEL[review.overallResult]
                        : "Brak wyniku"
                      : `Etap: ${review.stageLabel}`}
                  </div>
                  {print ? (
                    <Link
                      className="text-primary inline-flex min-h-11 items-center font-semibold"
                      to={`${PRINT_PATH}?ocena=${encodeURIComponent(review._id)}`}
                    >
                      Otwórz arkusz: {label}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}

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
  return (
    <>
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
            <RouteLink to={ASSIGN_PATH}>Zmień oceniającego</RouteLink>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <PersonalData card={card} employeeId={employeeId} />
          <Staffing
            employeeId={employeeId}
            events={card.staffingEvents}
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
  if (card === null) {
    return (
      <Card>
        Nie znaleziono pracownika albo ta rola nie ma do niego dostępu.
      </Card>
    );
  }
  return <CardView card={card} employeeId={employeeId} />;
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
        <StatusAlert tone="danger">
          Nie udało się wczytać karty. Sprawdź adres albo wróć do listy
          pracowników.
        </StatusAlert>
      );
    }
    return this.props.children;
  }
}

function Content() {
  const role = useDemoRole();
  const [params] = useSearchParams();
  const employeeId = params.get("pracownik");
  if (role !== "hr" && role !== "admin") {
    return (
      <Card>
        Ten widok jest dla roli „Kadry”. Wybierz ją w nagłówku, żeby zobaczyć
        kartę pracownika.
      </Card>
    );
  }
  if (!employeeId) {
    return (
      <Card>
        Nie wybrano pracownika. Otwórz kartę z listy w Panelu kadr albo z widoku
        przypisania oceniającego.
      </Card>
    );
  }
  return (
    <CardErrorBoundary key={employeeId}>
      <Workspace employeeId={employeeId as Id<"employees">} />
    </CardErrorBoundary>
  );
}

export function EmployeeCardPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section>
      <title>Karta pracownika</title>
      {online ? (
        <Content />
      ) : (
        <>
          <PageHeader title="Karta pracownika" />
          <Card>Widok wymaga połączenia z backendem (tryb offline).</Card>
        </>
      )}
    </section>
  );
}
