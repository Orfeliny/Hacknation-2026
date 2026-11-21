import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { getEnv } from "../../lib/env";
import { useDemoRole } from "../../lib/demoRole";
import { ReviewDetail } from "./ReviewDetail";
import { SelfNotes } from "./SelfNotes";

function Workspace() {
  const actor = { role: "employee" as const };
  const reviews = useQuery(api.me.queries.list, { actor });
  const [chosen, setChosen] = useState<Id<"reviews"> | undefined>();
  const selected = chosen ?? reviews?.[0]?._id;

  if (reviews === undefined) return <p>Ładowanie ocen…</p>;
  return (
    <div className="grid grid-cols-[16rem_1fr] gap-4">
      <nav aria-label="Moje oceny" className="space-y-2">
        {reviews.length === 0 && <p>Nie masz jeszcze żadnej oceny.</p>}
        {reviews.map((review) => (
          <button
            key={review._id}
            type="button"
            aria-pressed={review._id === selected}
            onClick={() => setChosen(review._id)}
            className="block w-full rounded-md border border-slate-200 bg-white p-3 text-left text-sm hover:bg-slate-50 aria-pressed:border-indigo-600"
          >
            <span className="block font-medium">
              {review.periodStart && review.periodEnd
                ? `${review.periodStart} – ${review.periodEnd}`
                : "Okres oceny nieustalony"}
            </span>
            <span className="text-slate-600">
              {review.stageLabel}
              {review.sheet ? `, arkusz ${review.sheet}` : ""}
            </span>
          </button>
        ))}
      </nav>
      <div className="space-y-4">
        {selected && <ReviewDetail key={selected} reviewId={selected} />}
        <SelfNotes reviewId={selected} />
      </div>
    </div>
  );
}

function OnlineMe() {
  const role = useDemoRole();
  if (role !== "employee") {
    return (
      <Card>
        Ten widok jest dla roli „oceniany”. Wybierz ją w nagłówku, żeby zobaczyć
        swoją ocenę.
      </Card>
    );
  }
  return <Workspace />;
}

export function MePage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-4">
      <title>Moja ocena i plan rozwoju</title>
      <h1 className="text-2xl font-bold tracking-tight">
        Moja ocena i plan rozwoju
      </h1>
      <p className="lg:hidden" role="status">
        Ten widok jest przeznaczony na komputer. Otwórz go na komputerze (min.
        1024 px szerokości).
      </p>
      <div className="hidden lg:block">
        {online ? (
          <OnlineMe />
        ) : (
          <p>Widok wymaga połączenia z backendem (tryb offline).</p>
        )}
      </div>
    </section>
  );
}
