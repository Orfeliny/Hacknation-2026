import { Link } from "react-router";
import { useRouteRegistered } from "../../app/index";
import { Card } from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import type { CardData } from "./card";

const PRINT_PATH = "/druk";
const RESULT_LABEL = { positive: "Pozytywna", negative: "Negatywna" } as const;

export function History({ card }: { card: CardData }) {
  const print = useRouteRegistered(PRINT_PATH);
  return (
    <section aria-labelledby="h-hist">
      <Card>
        <h2 id="h-hist" className="mb-2 text-xl font-bold">
          Historia ocen
        </h2>
        {card.reviews.length === 0 ? (
          <p>Brak ocen tego pracownika.</p>
        ) : (
          <ul>
            {card.reviews.map((review) => {
              const closed = review.stage === "closed";
              const label = closed
                ? review.dueDate
                  ? formatDate(review.dueDate)
                  : "Zamknięta ocena"
                : "Bieżąca ocena";
              return (
                <li
                  key={review._id}
                  className="border-divider flex flex-wrap items-center justify-between gap-2 border-t py-3 first:border-t-0"
                >
                  <div>
                    <div className="font-bold">{label}</div>
                    <div className="text-muted">
                      {closed
                        ? review.overallResult
                          ? RESULT_LABEL[review.overallResult]
                          : "Brak wyniku"
                        : `Etap: ${review.stageLabel}`}
                    </div>
                  </div>
                  {closed && print ? (
                    <Link
                      className="text-primary inline-flex min-h-11 items-center font-semibold"
                      to={`${PRINT_PATH}?ocena=${encodeURIComponent(review._id)}`}
                    >
                      Otwórz arkusz<span className="sr-only"> z {label}</span>
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
