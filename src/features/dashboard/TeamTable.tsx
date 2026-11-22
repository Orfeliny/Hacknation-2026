import { useState } from "react";
import { RouteLink } from "../../app/index";
import { Icon } from "../../components/ui/Icon";
import { formatDate, formatShortWithWeekday } from "../../lib/format";
import { ClockIcon } from "./icons";
import {
  byDeadline,
  dayCount,
  formalGaps,
  isWaiting,
  SOON_DAYS,
  stageNote,
  tableAction,
  type DashboardRow,
} from "./model";

const PILL = "bg-surface-muted text-ink inline-block rounded-full px-3 py-1";

function DueCell({ row }: { row: DashboardRow }) {
  if (row.dueDate === null || row.daysLeft === null) {
    return <span className="text-muted">brak terminu</span>;
  }
  const date = (
    <div className="text-muted mt-1 text-sm">
      {formatShortWithWeekday(row.dueDate)}
    </div>
  );
  const shifted = row.shiftedFrom && (
    <div className="text-muted text-sm">
      Przesunięty z {formatDate(row.shiftedFrom)}
    </div>
  );
  let status;
  if (isWaiting(row)) {
    status = (
      <span className={`${PILL} text-muted font-semibold whitespace-nowrap`}>
        czekasz
      </span>
    );
  } else if (row.daysLeft <= SOON_DAYS) {
    status = (
      <span
        className={`inline-flex items-center gap-1.5 font-bold whitespace-nowrap ${row.daysLeft < 0 ? "text-danger" : "text-warning"}`}
      >
        <ClockIcon />
        {dayCount(row.daysLeft)}
      </span>
    );
  } else {
    status = (
      <span className={`${PILL} font-bold whitespace-nowrap`}>
        {dayCount(row.daysLeft)}
      </span>
    );
  }
  return (
    <>
      {status}
      {date}
      {shifted}
    </>
  );
}

function StageCell({ row }: { row: DashboardRow }) {
  const note = stageNote(row);
  return (
    <>
      <span className="text-ink">{row.stageLabel}</span>
      {note && (
        <div className="text-muted text-sm">
          {note.text}
          {note.basis && <> Podstawa: {note.basis.label}</>}
        </div>
      )}
      {row.gapCount > 0 && (
        <div className="text-danger flex items-center gap-1.5 text-sm font-semibold">
          <Icon name="danger" className="size-4 shrink-0" />
          {formalGaps(row.gapCount)}
        </div>
      )}
    </>
  );
}

function ToggleButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-4 text-[15px] ${
        pressed
          ? "border-ink bg-ink font-semibold text-white"
          : "border-border text-ink bg-white"
      }`}
    >
      {children}
    </button>
  );
}

export function TeamTable({
  rows,
  todoIds,
}: {
  rows: DashboardRow[];
  todoIds: Set<string>;
}) {
  const [onlyTodo, setOnlyTodo] = useState(false);
  const shown = onlyTodo ? rows.filter((r) => todoIds.has(r.reviewId)) : rows;
  const sorted = [...shown].sort((a, b) => byDeadline(a.dueDate, b.dueDate));
  return (
    <section
      aria-labelledby="h-zespol"
      className="border-border min-w-0 grow-[999] basis-[560px] rounded-xl border bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-[18px]">
        <h2 id="h-zespol" className="text-section font-bold">
          Oceny mojego zespołu
        </h2>
        {rows.length > 0 && (
          <div role="group" aria-label="Filtr" className="flex gap-2">
            <ToggleButton
              pressed={!onlyTodo}
              onClick={() => setOnlyTodo(false)}
            >
              {`Wszystkie (${rows.length})`}
            </ToggleButton>
            <ToggleButton pressed={onlyTodo} onClick={() => setOnlyTodo(true)}>
              {`Twoje działania (${todoIds.size})`}
            </ToggleButton>
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-6 pb-6">Nie masz jeszcze ocen w zespole.</p>
      ) : sorted.length === 0 ? (
        <p className="px-6 pb-6">Żadna ocena nie czeka teraz na Ciebie.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">
              Oceny zespołu, posortowane według najbliższego terminu
            </caption>
            <thead>
              <tr className="bg-surface-muted text-muted text-sm">
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  Termin <span aria-hidden="true">↑</span>
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Pracownik
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Etap
                </th>
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  <span className="sr-only">Akcja</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const action = tableAction(row);
                return (
                  <tr
                    key={row.reviewId}
                    className="border-divider border-t align-top"
                  >
                    <td className="px-6 py-4">
                      <DueCell row={row} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-bold">{row.employeeName}</div>
                      <div className="text-muted text-sm">
                        {row.position}
                        {row.sheet ? ` · arkusz ${row.sheet}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <StageCell row={row} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <RouteLink
                        to={action.to}
                        className="text-primary font-semibold"
                      >
                        {action.label}
                        <span className="sr-only">: {row.employeeName}</span>
                      </RouteLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
