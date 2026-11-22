import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import type { ReviewView } from "./types";

export function FormalCheck({ gaps }: { gaps: ReviewView["gaps"] }) {
  return (
    <Card className="space-y-3" aria-labelledby="formal-check-heading">
      <h3 id="formal-check-heading" className="text-lg font-bold">
        Kontrola formalna
      </h3>
      {gaps.length === 0 ? (
        <StatusAlert tone="success" live={false}>
          Nie ma braków formalnych blokujących przejście dalej.
        </StatusAlert>
      ) : (
        <ul className="space-y-2">
          {gaps.map((g) => (
            <li key={`${g.code}-${g.message}`}>
              <StatusAlert tone="danger" live={false}>
                Brak: {g.message}{" "}
                <span className="text-muted font-normal">({g.source})</span>
              </StatusAlert>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
