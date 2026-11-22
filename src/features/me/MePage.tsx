import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { getEnv } from "../../lib/env";
import { useDemoRole } from "../../lib/demoRole";
import { formatDate } from "../../lib/format";
import { ReviewDetail } from "./ReviewDetail";

function Workspace() {
  const actor = { role: "employee" as const };
  const reviews = useQuery(api.me.queries.list, { actor });
  const [chosen, setChosen] = useState<Id<"reviews"> | undefined>();

  if (reviews === undefined) return <p>Ładowanie ocen…</p>;
  if (reviews.length === 0) return <p>Nie masz jeszcze żadnej oceny.</p>;
  const selected = reviews.find((r) => r._id === chosen) ?? reviews[0];

  return (
    <div className="space-y-6">
      {reviews.length > 1 && (
        <Field label="Moje oceny">
          <Select
            value={selected?._id}
            onChange={(e) => setChosen(e.target.value as Id<"reviews">)}
          >
            {reviews.map((review) => (
              <option key={review._id} value={review._id}>
                {review.periodStart && review.periodEnd
                  ? `${formatDate(review.periodStart)} – ${formatDate(review.periodEnd)}`
                  : "Okres oceny nieustalony"}
                {`, ${review.stageLabel}`}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {selected && <ReviewDetail key={selected._id} reviewId={selected._id} />}
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
    <section>
      <title>Moja ocena okresowa</title>
      <PageHeader title="Moja ocena okresowa" />
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
