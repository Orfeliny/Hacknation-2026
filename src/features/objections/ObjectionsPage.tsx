import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { daysBetween } from "../../../convex/rules/dates";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate, today } from "../../lib/format";
import { DecisionForm } from "./DecisionForm";

const ISAP_ART_83 =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20082271505#art-83";

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

function List() {
  const role = useDemoRole();
  const allowed = role === "director" || role === "hr" || role === "admin";
  const rows = useQuery(
    api.objections.queries.listForDirector,
    allowed ? { actor: { role } } : "skip",
  );
  if (!allowed) {
    return (
      <Card>
        Sprzeciwy rozpatruje dyrektor generalny. Wybierz w nagłówku rolę
        „Dyrektor”, żeby je zobaczyć.
      </Card>
    );
  }
  if (rows === undefined) return <p>Ładowanie sprzeciwów…</p>;
  if (rows.length === 0) return <Card>Brak sprzeciwów do rozpatrzenia.</Card>;
  return (
    <ul className="space-y-6">
      {rows.map((row) => (
        <li key={row.reviewId}>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-ink text-xl font-bold">
                  {row.employeeName}
                  {row.position ? `, ${row.position}` : ""}
                </h2>
                <p className="text-muted">
                  {[
                    row.unit,
                    row.evaluatorName && `oceniający: ${row.evaluatorName}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-muted">
                  Sprzeciw wpłynął {formatDate(row.filedAt)}
                  {row.acknowledgedAt
                    ? ` · zapoznanie potwierdzone ${formatIsoDay(row.acknowledgedAt)}`
                    : ""}
                </p>
                {row.round > 1 ? (
                  <Badge className="mt-2">
                    Ocena po raz drugi (podejście {row.round})
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Icon
                  name={row.overdue ? "danger" : "warning"}
                  className={`size-6 ${row.overdue ? "text-danger" : "text-warning"}`}
                />
                <div>
                  <div className="text-muted text-sm">
                    Termin rozpatrzenia (14 dni)
                  </div>
                  <div
                    className={`text-xl font-bold ${row.overdue ? "text-danger" : "text-warning"}`}
                  >
                    {formatIsoDay(row.decisionDeadline)} ·{" "}
                    {daysLeftLabel(row.decisionDeadline)}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-ink font-semibold">
                Uzasadnienie pracownika
              </h3>
              <p className="whitespace-pre-line">{row.text}</p>
            </div>
            <Link
              className="text-primary inline-flex min-h-11 items-center font-semibold"
              to={`/oceny?ocena=${encodeURIComponent(row.reviewId)}`}
            >
              Zobacz ocenę
              <span className="sr-only">: {row.employeeName}</span>
            </Link>
            {role === "director" ? (
              <DecisionForm
                reviewId={row.reviewId}
                employeeName={row.employeeName}
              />
            ) : (
              <p className="text-muted">
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
    <section className="space-y-6">
      <title>Sprzeciwy</title>
      <PageHeader
        title="Sprzeciwy od ocen"
        description="Sprzeciwy czekające na rozstrzygnięcie, od najbliższego terminu."
      />
      {online ? (
        <List />
      ) : (
        <StatusAlert tone="info">
          Tryb offline: lista sprzeciwów wymaga połączenia z backendem.
        </StatusAlert>
      )}
      <p className="text-muted text-sm">
        Podstawa:{" "}
        <ExternalLink href={ISAP_ART_83}>
          art. 83 ustawy o służbie cywilnej
        </ExternalLink>{" "}
        (do potwierdzenia przez prawnika).
      </p>
    </section>
  );
}
