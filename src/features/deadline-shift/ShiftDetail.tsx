import { useState } from "react";
import type { ShiftRequest } from "../../../convex/lib/contracts/deadlineShift";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useShift } from "../../lib/backend/deadlineShift";
import { formatDate, formatDateTime } from "../../lib/format";
import { DecisionForm } from "./DecisionForm";
import {
  BASIS_EXPLANATION,
  BASIS_LABELS,
  REASON_LABELS,
  STATUS_LABELS,
  legalBasis,
} from "./labels";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="text-ink font-semibold">{value}</dd>
    </div>
  );
}

function Decided({ shift }: { shift: ShiftRequest }) {
  return (
    <section aria-labelledby="decided-heading" className="flex flex-col gap-2">
      <h2 id="decided-heading" className="text-ink text-xl font-bold">
        Rozstrzygnięcie
      </h2>
      <p className="font-semibold">
        {STATUS_LABELS[shift.status]}
        {shift.status === "approved"
          ? `, nowy termin ${formatDate(shift.newDate)}`
          : ""}
      </p>
      {shift.decidedByName && shift.decidedAt ? (
        <p className="text-muted text-sm">
          {shift.decidedByName}, {formatDateTime(shift.decidedAt)}
        </p>
      ) : null}
      {shift.decisionJustification ? (
        <p className="whitespace-pre-line">{shift.decisionJustification}</p>
      ) : null}
      <StatusAlert tone="info" live={false}>
        {shift.noticeSentAt
          ? `Kadry wysłały pismo ${formatDate(shift.noticeSentAt)}.`
          : "Termin zmieni się dopiero po wysłaniu pisma przez kadry."}
      </StatusAlert>
    </section>
  );
}

export function ShiftDetail({
  reviewId,
  changeIndex,
}: {
  reviewId: string;
  changeIndex: number;
}) {
  const { data: shift } = useShift({
    reviewId: reviewId as ShiftRequest["reviewId"],
    changeIndex,
  });
  const [saved, setSaved] = useState(false);

  if (shift === undefined) return <p>Ładowanie wniosku…</p>;
  if (shift === null) {
    return (
      <StatusAlert tone="warning" live={false}>
        Nie znaleziono wniosku. Wybierz go z listy.
      </StatusAlert>
    );
  }
  const legal = legalBasis(shift.basis);

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-ink text-xl font-bold">
            {shift.employeeName}, {shift.employeePosition}
          </h2>
          <p className="text-muted">
            {REASON_LABELS[shift.reason]} z {formatDate(shift.createdAt)}
          </p>
        </div>
        <Badge>{BASIS_LABELS[shift.basis]}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <Fact label="Obecny termin" value={formatDate(shift.currentDueDate)} />
        <Fact
          label="Proponowany termin"
          value={shift.proposedDate ? formatDate(shift.proposedDate) : "brak"}
        />
      </dl>
      {shift.employeeReason ? (
        <section aria-labelledby="reason-heading">
          <h3 id="reason-heading" className="text-muted text-sm">
            Powód podany przez pracownika
          </h3>
          <p className="whitespace-pre-line">{shift.employeeReason}</p>
        </section>
      ) : null}
      <section aria-labelledby="legal-heading" className="flex flex-col gap-1">
        <h3 id="legal-heading" className="text-muted text-sm">
          Podstawa prawna
        </h3>
        <p>{legal.text}</p>
        <p>
          <ExternalLink href={legal.href}>{legal.anchorLabel}</ExternalLink>
        </p>
        <p className="text-muted text-sm">{BASIS_EXPLANATION[shift.basis]}</p>
      </section>
      {saved ? (
        <StatusAlert tone="info">
          Decyzja zapisana i przekazana do kadr.
        </StatusAlert>
      ) : null}
      {shift.status === "requested" ? (
        <DecisionForm shift={shift} onSaved={() => setSaved(true)} />
      ) : (
        <Decided shift={shift} />
      )}
    </Card>
  );
}
