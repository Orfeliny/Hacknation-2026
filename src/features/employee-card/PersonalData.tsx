import type { ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { isSubjectToReview } from "../../../convex/rules/validateReview";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { useShiftsForEmployee } from "../../lib/backend/deadlineShift";
import { formatDate, today } from "../../lib/format";
import type { CardData } from "./card";
import { CORPS_ROLE, ISAP, POSITION_KIND } from "./labels";

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

function DueDate({
  card,
  employeeId,
}: {
  card: CardData;
  employeeId: Id<"employees">;
}) {
  const { data: shifts } = useShiftsForEmployee({ employeeId });
  const current = card.reviews.find((r) => r.stage !== "closed");
  if (!current?.dueDate) return <>Brak otwartej oceny</>;
  const overdue = current.dueDate < today().toISOString().slice(0, 10);
  const applied = shifts?.find(
    (s) =>
      s.status === "approved" &&
      s.noticeSentAt !== undefined &&
      s.newDate === current.dueDate &&
      s.previousDate !== current.dueDate,
  );
  return (
    <>
      <span className="block font-bold">{formatDate(current.dueDate)}</span>
      {overdue ? (
        <span className="text-danger flex items-center gap-1.5 text-sm font-bold">
          <Icon name="danger" className="size-4" />
          Po terminie
        </span>
      ) : null}
      {applied ? (
        <span className="text-muted block text-sm font-normal">
          Przesunięty z {formatDate(applied.previousDate)}
        </span>
      ) : null}
    </>
  );
}

export function PersonalData({
  card,
  employeeId,
}: {
  card: CardData;
  employeeId: Id<"employees">;
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
        <span
          className={`flex items-center gap-1.5 font-bold ${subject ? "text-success" : ""}`}
        >
          {subject ? <Icon name="success" className="size-4" /> : null}
          {subject ? "Tak" : "Nie"}
        </span>
        <span className="text-muted block text-sm font-normal">
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
      <Card className="space-y-3">
        <h2 id="h-dane" className="text-[22px] font-bold">
          Dane kadrowe
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-4">
          {rows.map(([term, value]) => (
            <div key={term}>
              <dt className="text-muted text-sm">{term}</dt>
              <dd className="mt-0.5 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}
