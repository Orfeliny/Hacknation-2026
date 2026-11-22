import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import type { ReviewView } from "./types";

export function FormalCheck({ gaps }: { gaps: ReviewView["gaps"] }) {
  return (
    <Card className="space-y-3" aria-labelledby="formal-check-heading">
      <h2 id="formal-check-heading" className="text-lg font-bold">
        Kontrola formalna
      </h2>
      {gaps.length === 0 ? (
        <p className="text-success flex items-center gap-2 font-semibold">
          <Icon name="success" className="size-5 shrink-0" />
          Nie ma braków formalnych blokujących przejście dalej.
        </p>
      ) : (
        <ul className="space-y-3">
          {gaps.map((g) => (
            <li
              key={`${g.code}-${g.message}`}
              className="flex items-start gap-2"
            >
              <Icon
                name="danger"
                className="text-danger mt-0.5 size-5 shrink-0"
              />
              <div>
                <p className="text-danger font-semibold">
                  <span className="sr-only">Brak: </span>
                  {g.message}
                </p>
                <p className="text-muted text-sm">{g.source}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
