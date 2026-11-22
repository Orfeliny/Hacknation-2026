import { useSearchParams } from "react-router";
import { RouteLink } from "../../app/index";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useShiftsForSupervisor } from "../../lib/backend/deadlineShift";
import { formatDate } from "../../lib/format";
import { ShiftDetail } from "./ShiftDetail";
import { ShiftList } from "./ShiftList";

const TITLE = "Wniosek o przesunięcie terminu oceny";

function Breadcrumb() {
  return (
    <nav
      aria-label="Ścieżka nawigacji"
      className="text-muted flex items-center gap-2"
    >
      <RouteLink to="/pulpit">Pulpit</RouteLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">Wniosek o przesunięcie terminu</span>
    </nav>
  );
}

export function DeadlineShiftPage() {
  const [params] = useSearchParams();
  const { data: rows, isDemo } = useShiftsForSupervisor();
  const reviewId = params.get("ocena");
  const rawIndex = params.get("zmiana");
  const requested = reviewId !== null || rawIndex !== null;
  const changeIndex = Number(rawIndex);
  const selected =
    rows && reviewId && rawIndex !== null && Number.isInteger(changeIndex)
      ? rows.find(
          (row) => row.reviewId === reviewId && row.changeIndex === changeIndex,
        )
      : undefined;
  const others = rows?.filter((row) => row !== selected) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Wniosek o przesunięcie terminu</PageTitle>
      <Breadcrumb />
      <PageHeader
        title={TITLE}
        description={
          selected
            ? `${selected.employeeName} · ${selected.employeePosition} · wniosek z ${formatDate(selected.createdAt)}`
            : "Rozstrzygnij wniosek pracownika. Pismo przygotowują i wysyłają kadry."
        }
      />
      {isDemo ? <DemoDataNote /> : null}
      {rows === undefined ? <p>Ładowanie wniosków…</p> : null}
      {rows && requested && !selected ? (
        <StatusAlert tone="warning" live={false}>
          Nie znaleziono wniosku. Wybierz go z listy poniżej albo wróć na
          pulpit.
        </StatusAlert>
      ) : null}
      {selected ? (
        <ShiftDetail
          key={`${selected.reviewId}:${selected.changeIndex}`}
          shift={selected}
        />
      ) : null}
      {rows ? (
        <section aria-labelledby="list-heading" className="flex flex-col gap-3">
          {selected && others.length === 0 ? null : (
            <>
              <h2 id="list-heading" className="text-ink text-xl font-bold">
                {selected ? "Inne wnioski" : "Wnioski o przesunięcie"}
              </h2>
              <ShiftList rows={others} />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
