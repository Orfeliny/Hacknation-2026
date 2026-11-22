import { RouteLink } from "../../app/index";
import { formatDate } from "../../lib/format";
import { previewPath, type DashboardRow, type NoticeEntry } from "./model";

function WaitingText({ row }: { row: DashboardRow }) {
  if (row.stage === "objection") {
    return (
      <>
        <strong>{row.employeeName}</strong> złożył(a) sprzeciw. Rozpatrzy go
        dyrektor generalny.
      </>
    );
  }
  if (row.stage === "signing" || row.objectionDeadline === null) {
    return (
      <>
        <strong>{row.employeeName}</strong> ma się zapoznać z oceną. Czeka na
        jej podpis.
      </>
    );
  }
  return (
    <>
      <strong>{row.employeeName}</strong> może do{" "}
      {formatDate(row.objectionDeadline)} złożyć sprzeciw. Jeśli to zrobi,
      rozpatrzy go dyrektor generalny.
    </>
  );
}

const ROW =
  "border-divider flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t py-3";
const LEAD = "text-muted basis-[140px] font-bold";

export function WaitingSection({
  rows,
  notices,
}: {
  rows: DashboardRow[];
  notices: NoticeEntry[];
}) {
  return (
    <section
      aria-labelledby="h-czekasz"
      className="bg-surface-muted space-y-3 rounded-xl px-6 py-5"
    >
      <div>
        <h2 id="h-czekasz" className="text-xl font-bold">
          Czekasz na innych
        </h2>
        <p className="text-muted mt-1 text-[15px]">
          Tu nic nie musisz robić. Sprawy prowadzą inne osoby.
        </p>
      </div>
      {rows.length === 0 && notices.length === 0 ? (
        <p>Na nikogo nie czekasz.</p>
      ) : (
        <ul>
          {notices.map((n) => (
            <li key={`n-${n.reviewId}-${n.changeIndex}`} className={ROW}>
              <span className={LEAD}>W toku</span>
              <span className="flex-1 basis-80">
                Kadry wysyłają <strong>{n.employeeName}</strong> pismo o{" "}
                {n.rejected
                  ? "nieuwzględnieniu wniosku o przesunięcie terminu"
                  : `przesunięciu terminu oceny z ${formatDate(n.previousDate)} na ${formatDate(n.newDate)}`}
                .
              </span>
            </li>
          ))}
          {rows.map((row) => (
            <li key={row.reviewId} className={ROW}>
              <span className={LEAD}>
                {row.objectionDeadline && row.stage === "objection_window"
                  ? `do ${formatDate(row.objectionDeadline).slice(0, 5)}`
                  : "W toku"}
              </span>
              <span className="flex-1 basis-80">
                <WaitingText row={row} />
              </span>
              <RouteLink
                to={previewPath(row)}
                className="text-primary text-[15px] font-semibold"
              >
                Podgląd oceny
                <span className="sr-only">: {row.employeeName}</span>
              </RouteLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
