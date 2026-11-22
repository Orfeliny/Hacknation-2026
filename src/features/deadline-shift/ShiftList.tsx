import { Link } from "react-router";
import { Badge } from "../../components/ui/Badge";
import { formatDate } from "../../lib/format";
import type { ShiftRequest } from "../../../convex/lib/contracts/deadlineShift";
import { STATUS_LABELS, shiftHref } from "./labels";

export function ShiftList({ rows }: { rows: readonly ShiftRequest[] }) {
  if (rows.length === 0) return <p>Brak wniosków o przesunięcie terminu.</p>;
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {rows.map((row) => (
        <li key={`${row.reviewId}:${row.changeIndex}`}>
          <Link
            to={shiftHref(row)}
            className="border-border hover:bg-surface-muted flex min-h-11 flex-col gap-1 rounded-md border bg-white p-3 no-underline"
          >
            <span className="text-ink font-semibold">
              {row.employeeName}, {row.employeePosition}
            </span>
            <span className="text-muted text-sm">
              Wniosek z {formatDate(row.createdAt)}, termin do{" "}
              {formatDate(row.currentDueDate)}
            </span>
            <Badge className="self-start">{STATUS_LABELS[row.status]}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
