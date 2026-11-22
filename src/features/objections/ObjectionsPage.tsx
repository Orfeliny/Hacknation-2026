import { useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { daysBetween } from "../../../convex/rules/dates";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate, today } from "../../lib/format";
import { DecisionForm } from "./DecisionForm";

const ISAP_ART_83 =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20082271505#art-83";
const LIST_PATH = "/sprzeciwy";
const H2 = "text-[22px] font-bold";
const PANEL = "border-border space-y-3 rounded-xl border bg-white px-6 py-5";
const OUTLINE_LINK =
  "border-primary text-primary inline-flex min-h-11 items-center rounded-md border bg-white px-4 font-semibold";

function isoToday() {
  const d = today();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Noon keeps the calendar day stable in any timezone.
const formatIsoDay = (iso: string) => formatDate(`${iso}T12:00:00`);

function daysLeftLabel(deadline: string) {
  const left = daysBetween(isoToday(), deadline);
  if (left < 0) return "termin minął";
  if (left === 0) return "dziś";
  if (left === 1) return "jutro";
  return `za ${left} dni`;
}

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.objections.queries.listForDirector>>
>[number];

const sheetLink = (row: Row) =>
  `/oceny?ocena=${encodeURIComponent(row.reviewId)}`;
const detailLink = (row: Row) =>
  `${LIST_PATH}?ocena=${encodeURIComponent(row.reviewId)}`;

function DeadlineTile({ row }: { row: Row }) {
  return (
    <div className="border-border flex items-center gap-3 rounded-[10px] border bg-white px-4 py-3">
      <Icon
        name={row.overdue ? "danger" : "warning"}
        className={`size-6 ${row.overdue ? "text-danger" : "text-warning"}`}
      />
      <div>
        <div className="text-muted text-sm">Termin rozpatrzenia (14 dni)</div>
        <div
          className={`text-xl font-bold ${row.overdue ? "text-danger" : "text-warning"}`}
        >
          {formatIsoDay(row.decisionDeadline)} ·{" "}
          {daysLeftLabel(row.decisionDeadline)}
        </div>
      </div>
    </div>
  );
}

function Table({ rows }: { rows: Row[] }) {
  return (
    <div className="border-border overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left">
        <caption className="sr-only">
          Sprzeciwy czekające na rozstrzygnięcie
        </caption>
        <thead className="text-muted text-sm">
          <tr className="border-border border-b">
            <th scope="col" className="px-4 py-3">
              Pracownik
            </th>
            <th scope="col" className="px-4 py-3">
              Wpłynął
            </th>
            <th scope="col" className="px-4 py-3">
              Termin rozpatrzenia
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Akcje</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.reviewId}
              className="border-border border-b last:border-0"
            >
              <th scope="row" className="px-4 py-3 font-semibold">
                {row.employeeName}
                <span className="text-muted block text-sm font-normal">
                  {[row.position, row.unit].filter(Boolean).join(" · ")}
                </span>
                {row.round > 1 ? (
                  <Badge className="mt-1">Podejście {row.round}</Badge>
                ) : null}
              </th>
              <td className="px-4 py-3">{formatDate(row.filedAt)}</td>
              <td
                className={`px-4 py-3 font-bold ${row.overdue ? "text-danger" : "text-warning"}`}
              >
                {formatIsoDay(row.decisionDeadline)} ·{" "}
                {daysLeftLabel(row.decisionDeadline)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  className="text-primary inline-flex min-h-11 items-center font-semibold"
                  to={detailLink(row)}
                >
                  Otwórz sprzeciw
                  <span className="sr-only">: {row.employeeName}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Quote({ label, text }: { label: string; text: string }) {
  return (
    <>
      <h3 className="font-bold">{label}</h3>
      <p className="bg-surface-muted max-w-[75ch] rounded-[10px] px-4 py-3.5 whitespace-pre-line">
        {text}
      </p>
    </>
  );
}

function Detail({ row, canDecide }: { row: Row; canDecide: boolean }) {
  const average =
    row.averageScore !== null
      ? `${String(row.averageScore).replace(".", ",")}${row.overallLevelLabel ? ` · ${row.overallLevelLabel}` : ""}`
      : null;
  return (
    <div className="space-y-6">
      <PageTitle>{`Sprzeciw od oceny: ${row.employeeName}`}</PageTitle>
      <div>
        <nav aria-label="Ścieżka nawigacji" className="text-muted mb-4 text-sm">
          <Link to={LIST_PATH} className="text-primary underline">
            Sprzeciwy
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{row.employeeName}</span>
        </nav>
        <PageHeader
          title={`Sprzeciw od oceny: ${row.employeeName}`}
          description={
            <>
              {[
                row.position,
                row.unit,
                row.evaluatorName && `oceniający: ${row.evaluatorName}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              <span className="block">
                Sprzeciw wpłynął {formatDate(row.filedAt)}.
              </span>
            </>
          }
          actions={<DeadlineTile row={row} />}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        <div className="space-y-6">
          <section aria-labelledby="h-tresc" className={PANEL}>
            <h2 id="h-tresc" className={H2}>
              Czego dotyczy sprzeciw
            </h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {average ? (
                <div className="bg-surface-muted rounded-[10px] px-3.5 py-3">
                  <dt className="text-muted text-sm font-bold">Średnia</dt>
                  <dd className="font-bold">{average}</dd>
                </div>
              ) : null}
              {row.acknowledgedAt ? (
                <div className="bg-surface-muted rounded-[10px] px-3.5 py-3">
                  <dt className="text-muted text-sm font-bold">Zapoznanie</dt>
                  <dd className="font-bold">
                    Potwierdzone {formatIsoDay(row.acknowledgedAt)}
                  </dd>
                </div>
              ) : null}
              {row.round > 1 ? (
                <div className="bg-surface-muted rounded-[10px] px-3.5 py-3">
                  <dt className="text-muted text-sm font-bold">Podejście</dt>
                  <dd className="font-bold">
                    Ocena po raz drugi ({row.round})
                  </dd>
                </div>
              ) : null}
            </dl>
            <Quote label="Uzasadnienie pracownika" text={row.text} />
            {row.overallJustification ? (
              <Quote
                label="Uzasadnienie oceniającego"
                text={row.overallJustification}
              />
            ) : null}
            <div>
              <Link className={OUTLINE_LINK} to={sheetLink(row)}>
                Otwórz arkusz<span className="sr-only"> oceny</span>
              </Link>
            </div>
          </section>
          {canDecide ? (
            <section
              aria-labelledby="h-decyzja"
              className="border-ink space-y-4 rounded-xl border-2 bg-white px-6 py-5"
            >
              <h2 id="h-decyzja" className={H2}>
                Rozstrzygnięcie
              </h2>
              <DecisionForm
                reviewId={row.reviewId}
                employeeName={row.employeeName}
                evaluatorName={row.evaluatorName}
              />
            </section>
          ) : (
            <Card>Decyzję podejmuje dyrektor generalny.</Card>
          )}
        </div>
        <aside aria-label="Zasady rozstrzygania" className="space-y-5">
          <section className={PANEL}>
            <h2 className={H2}>Kto zobaczy rozstrzygnięcie</h2>
            <p className="text-muted">
              Zobaczą je pracownik, oceniający i kadry.
            </p>
          </section>
          <section className="space-y-2 px-1">
            <h3 className="text-[17px] font-bold">Rozstrzyga dyrektor</h3>
            <p className="text-muted">Oceniający nie decyduje o sprzeciwie.</p>
          </section>
          <section className="space-y-2 px-1">
            <h3 className="text-[17px] font-bold">Bez AI</h3>
            <p className="text-muted">
              Asystent nie podpowiada rozstrzygnięcia ani nowej oceny.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ListHeader({ withDescription }: { withDescription: boolean }) {
  return (
    <>
      <PageTitle>Sprzeciwy</PageTitle>
      <PageHeader
        title="Sprzeciwy od ocen"
        description={
          withDescription
            ? "Sprzeciwy czekające na rozstrzygnięcie, od najbliższego terminu."
            : undefined
        }
      />
    </>
  );
}

function Content() {
  const role = useDemoRole();
  const [params] = useSearchParams();
  const requested = params.get("ocena");
  const allowed = role === "director" || role === "hr" || role === "admin";
  const rows = useQuery(
    api.objections.queries.listForDirector,
    allowed ? { actor: { role } } : "skip",
  );
  if (!allowed) {
    return (
      <>
        <ListHeader withDescription={false} />
        <Card>
          Sprzeciwy rozpatruje dyrektor generalny. Wybierz w nagłówku rolę
          „Dyrektor”, żeby je zobaczyć.
        </Card>
      </>
    );
  }
  if (rows === undefined) {
    return (
      <>
        <ListHeader withDescription />
        <p>Ładowanie sprzeciwów…</p>
      </>
    );
  }
  const row = requested ? rows.find((r) => r.reviewId === requested) : null;
  if (row) return <Detail row={row} canDecide={role === "director"} />;
  return (
    <>
      <ListHeader withDescription />
      {requested ? (
        <Card className="space-y-2">
          <p>Nie znaleziono sprzeciwu albo został już rozstrzygnięty.</p>
          <Link
            className="text-primary inline-flex min-h-11 items-center font-semibold"
            to={LIST_PATH}
          >
            Wróć do listy sprzeciwów
          </Link>
        </Card>
      ) : rows.length === 0 ? (
        <Card>Brak sprzeciwów do rozpatrzenia.</Card>
      ) : (
        <Table rows={rows} />
      )}
    </>
  );
}

function Legal() {
  return (
    <p className="text-muted text-sm">
      Podstawa:{" "}
      <ExternalLink href={ISAP_ART_83}>
        art. 83 ustawy o służbie cywilnej
      </ExternalLink>{" "}
      (do potwierdzenia przez prawnika).
    </p>
  );
}

export function ObjectionsPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-6">
      {online ? (
        <Content />
      ) : (
        <>
          <ListHeader withDescription />
          <StatusAlert tone="info">
            Tryb offline: lista sprzeciwów wymaga połączenia z backendem.
          </StatusAlert>
        </>
      )}
      <Legal />
    </section>
  );
}
