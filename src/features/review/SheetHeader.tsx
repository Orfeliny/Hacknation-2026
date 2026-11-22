import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { formatDate } from "../../lib/format";
import type { ReviewView } from "./types";

const SHEET_C_BASIS =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20160000470#par-3-ust-4";

function daysLabel(daysLeft: number) {
  if (daysLeft < 0) return `${-daysLeft} dni po terminie`;
  if (daysLeft === 0) return "dziś";
  return `za ${daysLeft} dni`;
}

export function SheetHeader({ view }: { view: ReviewView }) {
  const { review, employee, evaluator } = view;
  const period =
    review.periodStart && review.periodEnd
      ? `okres oceny ${formatDate(review.periodStart)}–${formatDate(review.periodEnd)}`
      : null;
  const overdue = view.daysLeft !== null && view.daysLeft < 0;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h2 className="text-ink text-2xl font-bold">
          Ocena okresowa: {employee.firstName} {employee.lastName}
        </h2>
        <p className="text-muted">
          {[
            employee.position,
            period,
            `oceniający: ${evaluator.firstName} ${evaluator.lastName}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-muted">
          <strong className="text-ink">Arkusz {review.sheet}</strong>
          {review.sheet === "C" && (
            <>
              {" "}
              dotyczy stanowisk bez kierowania ludźmi. Podstawa:{" "}
              <ExternalLink href={SHEET_C_BASIS}>§ 3 ust. 4</ExternalLink>.
            </>
          )}
        </p>
        {view.can.asEmployee && (
          <p className="font-semibold">
            To Twoja ocena: możesz ją przeglądać i potwierdzać, ale nie
            edytować.
          </p>
        )}
      </div>
      {review.dueDate && (
        <div className="border-border flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
          <Icon name="info" className="text-ink size-6" />
          <div>
            <p className="text-muted">Termin sporządzenia</p>
            <p
              className={`text-xl font-bold ${overdue ? "text-danger" : "text-ink"}`}
            >
              {formatDate(review.dueDate)}
              {view.daysLeft !== null && ` · ${daysLabel(view.daysLeft)}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
