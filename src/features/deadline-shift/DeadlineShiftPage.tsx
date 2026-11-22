import { useSearchParams } from "react-router";
import { RouteLink } from "../../app/index";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { useShiftsForSupervisor } from "../../lib/backend/deadlineShift";
import { ShiftDetail } from "./ShiftDetail";
import { ShiftList } from "./ShiftList";

export function DeadlineShiftPage() {
  const [params] = useSearchParams();
  const { data: rows, isDemo } = useShiftsForSupervisor();
  const reviewId = params.get("ocena");
  const rawIndex = params.get("zmiana");
  const index = Number(rawIndex);
  const selected =
    reviewId && rawIndex !== null && Number.isInteger(index)
      ? { reviewId, changeIndex: index }
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ścieżka nawigacji" className="flex items-center gap-2">
        <RouteLink to="/pulpit">Pulpit</RouteLink>
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
        <span aria-current="page" className="text-muted">
          Wniosek o przesunięcie terminu
        </span>
      </nav>
      <PageHeader
        title="Wniosek o przesunięcie terminu oceny"
        description="Rozstrzygnij wniosek pracownika. Pismo przygotowują i wysyłają kadry."
      />
      {isDemo ? <DemoDataNote /> : null}
      <div className="grid grid-cols-[20rem_1fr] items-start gap-6">
        <section aria-labelledby="list-heading" className="flex flex-col gap-3">
          <h2 id="list-heading" className="text-ink text-xl font-bold">
            Wnioski o przesunięcie
          </h2>
          {rows === undefined ? (
            <p>Ładowanie wniosków…</p>
          ) : (
            <ShiftList rows={rows} selected={selected} />
          )}
        </section>
        <div>
          {selected ? (
            <ShiftDetail
              key={`${selected.reviewId}:${selected.changeIndex}`}
              {...selected}
            />
          ) : (
            <p className="text-muted">
              Wybierz wniosek z listy, żeby zobaczyć powód i podjąć decyzję.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
