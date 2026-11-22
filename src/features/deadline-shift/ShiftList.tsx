import { Link } from "react-router";
import { Badge } from "../../components/ui/Badge";
import { formatDate } from "../../lib/format";
import type { ShiftRequest } from "../../../convex/lib/contracts/deadlineShift";
import { STATUS_LABELS, shiftHref, type Address } from "./labels";

export function ShiftList({
  rows,
  selected,
}: {
  rows: readonly ShiftRequest[];
  selected?: Address | undefined;
}) {
  if (rows.length === 0) return <p>Brak wniosków o przesunięcie terminu.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const current =
          selected?.reviewId === row.reviewId &&
          selected.changeIndex === row.changeIndex;
        return (
          <li key={`${row.reviewId}:${row.changeIndex}`}>
            <Link
              to={shiftHref(row)}
              aria-current={current ? "page" : undefined}
              className={`border-border hover:bg-surface-muted flex min-h-11 flex-col gap-1 rounded-md border p-3 no-underline ${current ? "bg-surface-muted" : "bg-white"}`}
            >
              <span className="text-ink font-semibold">
                {row.employeeName}, wniosek z {formatDate(row.createdAt)}
              </span>
              <span className="text-muted text-sm">
                Termin do {formatDate(row.currentDueDate)}
              </span>
              <Badge className="self-start">{STATUS_LABELS[row.status]}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
