import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { formatDate } from "../../lib/format";
import { useShiftsAwaitingNotice } from "../../lib/backend/deadlineShift";
import { EmployeeLink } from "./EmployeeLink";
import { LEGAL } from "./labels";
import { ExternalLink } from "../../components/ui/ExternalLink";

export function AwaitingNotice() {
  const { data, isDemo } = useShiftsAwaitingNotice();
  return (
    <section aria-labelledby="h-pisma" className="space-y-3">
      <h2 id="h-pisma" className="text-xl font-bold">
        Pisma o nowym terminie do wysłania
      </h2>
      <p className="text-muted max-w-prose">
        Zmiana terminu oceny zaczyna obowiązywać dopiero po wysłaniu pisma
        pracownikowi (
        <ExternalLink href={LEGAL.art81ust7.href}>
          {LEGAL.art81ust7.text}
        </ExternalLink>
        ). Pismo przygotujesz i oznaczysz jako wysłane na karcie pracownika.
      </p>
      {isDemo ? <DemoDataNote /> : null}
      {data === undefined ? (
        <p>Ładowanie…</p>
      ) : data.length === 0 ? (
        <Card>Żadne pismo o nowym terminie nie czeka na wysłanie.</Card>
      ) : (
        <ul className="space-y-2">
          {data.map((row) => (
            <li key={`${row.reviewId}:${row.changeIndex}`}>
              <Card className="space-y-1">
                <p className="font-semibold">
                  <EmployeeLink
                    employeeId={row.employeeId}
                    name={row.employeeName}
                  />{" "}
                  <span className="text-muted font-normal">
                    · {row.employeePosition}
                  </span>
                </p>
                <p>
                  {row.status === "approved"
                    ? `Nowy termin oceny: ${formatDate(row.newDate)} (dotychczas ${formatDate(row.previousDate)}).`
                    : `Wniosek odrzucony. Termin oceny pozostaje ${formatDate(row.currentDueDate)}.`}
                </p>
                <p className="text-muted text-sm">
                  {row.basis === "mandatory"
                    ? "Przesunięty z mocy prawa. "
                    : "Za zgodą przełożonego. "}
                  Pracownik nie dostał jeszcze pisma. Oceniający:{" "}
                  {row.supervisorName}.
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
