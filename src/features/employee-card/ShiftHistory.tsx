import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { StatusAlert } from "../../components/ui/StatusAlert";
import {
  useMarkNoticeSent,
  useShiftsForEmployee,
} from "../../lib/backend/deadlineShift";
import type { ShiftRequest } from "../../../convex/lib/contracts/deadlineShift";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "../../lib/format";
import { ISAP, REASON_LABEL, STATUS_LABEL } from "./labels";

function ShiftEntry({ entry }: { entry: ShiftRequest }) {
  const markNoticeSent = useMarkNoticeSent();
  const [prepared, setPrepared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const awaitingNotice =
    entry.status !== "requested" && entry.noticeSentAt === undefined;
  const mandatory = entry.basis === "mandatory";
  const subject = `${REASON_LABEL[entry.reason] ?? entry.reason}, ${formatDate(entry.createdAt)}`;

  async function send() {
    setBusy(true);
    setFailed(false);
    try {
      await markNoticeSent({
        reviewId: entry.reviewId,
        changeIndex: entry.changeIndex,
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-divider border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong>{REASON_LABEL[entry.reason] ?? entry.reason}</strong>
        <span className="text-muted text-sm">
          {mandatory ? "Z mocy prawa" : "Fakultatywne"} ·{" "}
          {STATUS_LABEL[entry.status]}
        </span>
      </div>
      <p>
        Termin oceny: {formatDate(entry.previousDate)} →{" "}
        <strong>{formatDate(entry.newDate)}</strong>
        {entry.status === "rejected"
          ? " (termin bez zmian)"
          : awaitingNotice
            ? " (zmieni się po wysłaniu pisma)"
            : ""}
      </p>
      {entry.employeeReason ? (
        <p className="text-muted text-sm">
          Powód pracownika: {entry.employeeReason}
        </p>
      ) : null}
      {entry.decisionJustification ? (
        <p className="text-muted text-sm">
          Uzasadnienie decyzji
          {entry.decidedByName ? ` (${entry.decidedByName})` : ""}:{" "}
          {entry.decisionJustification}
        </p>
      ) : null}
      {entry.status === "requested" ? (
        <p className="mt-1 flex items-center gap-2">
          <Icon name="info" className="size-4" />
          Wniosek z {formatDate(entry.createdAt)} czeka na decyzję przełożonego.
        </p>
      ) : null}
      {entry.noticeSentAt !== undefined ? (
        <p className="mt-1 flex items-center gap-2">
          <Icon name="success" className="size-4" />
          Pismo wysłane {formatDate(entry.noticeSentAt)}.
        </p>
      ) : null}
      {awaitingNotice ? (
        <div className="mt-2 space-y-2">
          <StatusAlert tone="warning" live={false}>
            Pracownik nie dostał jeszcze pisma o{" "}
            {entry.status === "approved" ? "nowym terminie" : "decyzji"}.
          </StatusAlert>
          {prepared ? (
            <p className="text-sm">
              Pismo przygotowane: {entry.employeeName}, {subject}. Wyślij je
              pracownikowi, a potem oznacz jako wysłane.
            </p>
          ) : null}
          {failed ? (
            <StatusAlert tone="danger">
              Nie udało się oznaczyć pisma jako wysłanego. Spróbuj ponownie.
            </StatusAlert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              aria-label={`Przygotuj pismo: ${subject}`}
              onClick={() => setPrepared(true)}
            >
              Przygotuj pismo
            </Button>
            <Button
              aria-label={`Oznacz pismo jako wysłane: ${subject}`}
              disabled={busy}
              onClick={() => void send()}
            >
              Oznacz pismo jako wysłane
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ShiftHistory({ employeeId }: { employeeId: Id<"employees"> }) {
  const { data } = useShiftsForEmployee({ employeeId });
  return (
    <section aria-labelledby="h-shifts">
      <Card className="space-y-3">
        <div>
          <h2 id="h-shifts" className="text-lg font-bold">
            Przesunięcia terminu oceny
          </h2>
          <p className="text-muted text-sm">
            Termin zmienia się dopiero po wysłaniu pisma przez kadry.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-bold">Przesłanki obowiązkowe</h3>
            <p className="text-sm">
              Termin zmienia się z mocy prawa, na przykład po nieobecności
              trwającej nieprzerwanie dłużej niż miesiąc. Nikt o tym nie
              decyduje. Kadry wysyłają tylko pismo.
            </p>
            <ExternalLink href={`${ISAP}#art-81-ust-7`}>
              art. 81 ust. 7
            </ExternalLink>
          </div>
          <div>
            <h3 className="font-bold">Przesłanki fakultatywne</h3>
            <p className="text-sm">
              O przesunięciu decyduje przełożony, na wniosek pracownika albo z
              własnej inicjatywy. Każdy wniosek trzeba rozstrzygnąć.
            </p>
            <ExternalLink href={`${ISAP}#art-81-ust-8`}>
              art. 81 ust. 8
            </ExternalLink>
          </div>
        </div>
        {data === undefined ? (
          <p>Ładowanie historii przesunięć…</p>
        ) : data.length === 0 ? (
          <p>Ten pracownik nie ma przesunięć terminu oceny.</p>
        ) : (
          <ul>
            {data.map((entry) => (
              <ShiftEntry
                key={`${entry.reviewId}:${entry.changeIndex}`}
                entry={entry}
              />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
