import { addDays, daysBetween } from "../../../convex/rules/dates";
import { formatDate } from "../../lib/format";
import type { StaffingEvent } from "./Staffing";

const monthLabel = (iso: string) => `${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export function Timeline({
  events,
  dueDate,
}: {
  events: StaffingEvent[];
  dueDate?: string;
}) {
  const absences = events.filter((event) => event.kind === "long_absence");
  if (absences.length === 0) return null;
  const dates = [
    ...absences.flatMap((event) => [event.from, event.to ?? event.from]),
    ...(dueDate ? [dueDate] : []),
  ].sort();
  const first = dates[0] ?? absences[0]!.from;
  const last = dates[dates.length - 1] ?? first;
  const origin = `${first.slice(0, 7)}-01`;
  const total = daysBetween(origin, addDays(last, 1));
  const pct = (iso: string) => (daysBetween(origin, iso) / total) * 100;

  return (
    <div aria-hidden="true" className="flex flex-col gap-1.5">
      <div className="bg-surface-muted border-border relative h-9 rounded-md border">
        {absences.map((event) => {
          const end = event.to ?? last;
          return (
            <span
              key={`${event.from}-${event.to ?? ""}`}
              title={`${formatDate(event.from)}–${formatDate(end)}`}
              className="bg-ink absolute top-1.5 bottom-1.5 rounded-sm"
              style={{
                left: `${pct(event.from)}%`,
                width: `${Math.max(((daysBetween(event.from, end) + 1) / total) * 100, 1)}%`,
              }}
            />
          );
        })}
        {dueDate ? (
          <span
            title={`Termin oceny ${formatDate(dueDate)}`}
            className="border-info absolute -top-0.5 -bottom-0.5 border-l-2 border-dashed"
            style={{ left: `${Math.min(pct(dueDate), 99.5)}%` }}
          />
        ) : null}
      </div>
      <div className="text-muted flex justify-between text-sm">
        <span>{monthLabel(origin)}</span>
        <span>{monthLabel(last)}</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="bg-ink inline-block h-3 w-5 rounded-sm" />
          Przesuwa termin
        </span>
        {dueDate ? (
          <span className="inline-flex items-center gap-2">
            <span className="border-info inline-block h-3.5 border-l-2 border-dashed" />
            Termin oceny
          </span>
        ) : null}
      </div>
    </div>
  );
}
