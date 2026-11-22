import { useState } from "react";
import type { ShiftRequest } from "../../../convex/lib/contracts/deadlineShift";
import { Badge } from "../../components/ui/Badge";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { formatDate, formatDateTime } from "../../lib/format";
import { DecisionForm } from "./DecisionForm";
import { BASIS_EXPLANATION, BASIS_LABELS, STATUS_LABELS } from "./labels";

function Decided({ shift }: { shift: ShiftRequest }) {
  return (
    <section
      aria-labelledby="decided-heading"
      className="border-border flex min-w-0 flex-[999_1_35rem] flex-col gap-3 rounded-xl border bg-white p-6"
    >
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

function Aside({ basis }: { basis: ShiftRequest["basis"] }) {
  return (
    <aside
      aria-label="Rodzaje przesunięć"
      className="flex min-w-0 flex-[1_1_17rem] flex-col gap-4"
    >
      {(["mandatory", "optional"] as const).map((kind) => (
        <section
          key={kind}
          className={`border-border rounded-xl border bg-white px-4 py-4 ${kind === basis ? "border-dashed" : ""}`}
        >
          <h2 className="text-ink text-lg font-bold">
            {kind === "mandatory" ? "Obowiązkowe" : "Fakultatywne"}
            {kind === basis ? " (ten ekran)" : ""}
          </h2>
          <p>{BASIS_EXPLANATION[kind]}</p>
        </section>
      ))}
    </aside>
  );
}

export function ShiftDetail({ shift }: { shift: ShiftRequest }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-muted">
          Obecny termin to {formatDate(shift.currentDueDate)}.
          {shift.proposedDate
            ? ` Pracownik proponuje ${formatDate(shift.proposedDate)}.`
            : ""}
        </p>
        <Badge className="border-[#767676]">{BASIS_LABELS[shift.basis]}</Badge>
      </div>
      {saved ? (
        <StatusAlert tone="info">
          Decyzja zapisana i przekazana do kadr.
        </StatusAlert>
      ) : null}
      <div className="flex flex-wrap items-start gap-8">
        {shift.status === "requested" ? (
          <DecisionForm shift={shift} onSaved={() => setSaved(true)} />
        ) : (
          <Decided shift={shift} />
        )}
        <Aside basis={shift.basis} />
      </div>
    </div>
  );
}
