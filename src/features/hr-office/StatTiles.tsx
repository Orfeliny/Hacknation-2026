import { Icon } from "../../components/ui/Icon";
import { formatDate } from "../../lib/format";
import { plural } from "../../lib/plural";
import { daysLabel, daysOverdue, overdueText } from "./attention";
import type { BoardRow, ObjectionRow } from "./types";

type Tone = "danger" | "warning" | "info" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  neutral: "text-ink",
};

function Tile({
  count,
  label,
  detail,
  tone,
  icon,
}: {
  count: number;
  label: string;
  detail: string;
  tone: Tone;
  icon?: "danger" | "warning";
}) {
  const active = count > 0 ? tone : "neutral";
  return (
    <li className="border-border rounded-xl border bg-white px-5 py-4">
      <span
        className={`block text-4xl leading-tight font-bold ${TONE_TEXT[active]}`}
      >
        {count}
      </span>
      <span
        className={`flex items-center gap-1.5 font-bold ${TONE_TEXT[active]}`}
      >
        {count > 0 && icon ? (
          <Icon name={icon} className="size-[18px] flex-none" />
        ) : null}
        {label}
      </span>
      <span className="text-muted block text-sm">{detail}</span>
    </li>
  );
}

export function StatTiles({
  board,
  objections,
  awaitingNotice,
}: {
  board: readonly BoardRow[];
  objections: readonly ObjectionRow[];
  awaitingNotice: number;
}) {
  const overdue = board
    .filter((r) => r.overdue && r.dueDate !== null)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const worst = overdue[0];
  const nextObjection = [...objections].sort((a, b) =>
    a.decisionDeadline.localeCompare(b.decisionDeadline),
  )[0];
  const inAcknowledgement = board.filter(
    (r) => r.stage === "objection_window",
  ).length;

  return (
    <section aria-labelledby="h-stan">
      <h2 id="h-stan" className="sr-only">
        Stan procedury
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Tile
          count={overdue.length}
          label={plural(overdue.length, {
            one: "ocena po terminie",
            few: "oceny po terminie",
            many: "ocen po terminie",
          })}
          detail={
            worst
              ? `Opóźnienie: ${overdueText(daysOverdue(worst.dueDate!))} (${worst.unit})`
              : "Żadna ocena nie jest spóźniona."
          }
          tone="danger"
          icon="danger"
        />
        <Tile
          count={objections.length}
          label={plural(objections.length, {
            one: "sprzeciw u dyrektora generalnego",
            few: "sprzeciwy u dyrektora generalnego",
            many: "sprzeciwów u dyrektora generalnego",
          })}
          detail={
            nextObjection
              ? `Termin: ${formatDate(nextObjection.decisionDeadline)} · ${daysLabel(nextObjection.decisionDeadline).toLowerCase()}`
              : "Brak sprzeciwów do rozpatrzenia."
          }
          tone="warning"
          icon="warning"
        />
        <Tile
          count={awaitingNotice}
          label={plural(awaitingNotice, {
            one: "przesunięty termin bez pisma",
            few: "przesunięte terminy bez pisma",
            many: "przesuniętych terminów bez pisma",
          })}
          detail={
            awaitingNotice > 0
              ? "Pracownik nie dostał jeszcze pisma."
              : "Wszystkie pisma o nowym terminie wysłane."
          }
          tone="info"
        />
        <Tile
          count={inAcknowledgement}
          label={plural(inAcknowledgement, {
            one: "ocena na etapie zapoznania",
            few: "oceny na etapie zapoznania",
            many: "ocen na etapie zapoznania",
          })}
          detail="Pracownik zapoznaje się z oceną i może wnieść sprzeciw."
          tone="neutral"
        />
      </ul>
    </section>
  );
}
