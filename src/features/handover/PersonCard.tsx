import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { RatingScale } from "../../components/ui/RatingScale";
import { RouteLink } from "../../app/index";
import { formatDate } from "../../lib/format";
import {
  entryNoun,
  monthsNoun,
  observationNoun,
  packageStarted,
  total,
  type Choice,
  type PersonPlan,
} from "./plan";

export function PersonCard({
  person,
  choice,
  include,
  onChoice,
  onInclude,
}: {
  person: PersonPlan;
  choice: Choice;
  include: boolean;
  onChoice: (value: Choice) => void;
  onInclude: (value: boolean) => void;
}) {
  const headingId = `osoba-${person.employeeId}`;
  const months = Math.floor(person.supervisedDays / 30);
  const count = total(person);
  return (
    <article aria-labelledby={headingId}>
      <Card className="flex flex-col gap-4">
        <div>
          <h3 id={headingId} className="text-ink text-lg font-bold">
            {person.employeeName}
          </h3>
          <p className="text-muted">
            {person.position}. Nadzorujesz tę osobę od {months}{" "}
            {monthsNoun(months)}.
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <Badge>
              {person.early.available
                ? "Możesz ocenić wcześniej"
                : "Oceni następca"}
            </Badge>
            <span className="text-muted text-sm">{person.early.reason}</span>
          </p>
          {person.dueDate ? (
            <p className="text-muted text-sm">
              Termin oceny: {formatDate(person.dueDate)}
            </p>
          ) : null}
        </div>
        {person.early.available ? (
          <RatingScale
            legend={`Ocena: ${person.employeeName}`}
            name={`ocena-${person.employeeId}`}
            value={choice}
            onChange={(value) => onChoice(value as Choice)}
            options={[
              { value: "before", label: "Sporządzę ocenę przed odejściem" },
              { value: "successor", label: "Oceni następca, ja dam opinię" },
            ]}
          />
        ) : (
          <p>
            <strong>Ocena:</strong> oceni następca.
          </p>
        )}
        <div className="border-divider border-t pt-3">
          <h4 className="text-ink font-semibold">Obserwacje dla następcy</h4>
          {choice === "before" && person.early.available ? (
            <p className="text-muted">
              Nie dotyczy. Ocena zakończy się przed Twoim odejściem.
            </p>
          ) : count === 0 ? (
            <p className="text-muted">Nie masz wpisów o tej osobie.</p>
          ) : packageStarted(person) ? (
            <p>
              Pakiet: {person.handedOver} z {count} {entryNoun(count)}. Zmiany
              wprowadzasz na ekranie pakietu.
            </p>
          ) : (
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                className="size-5"
                checked={include}
                onChange={(e) => onInclude(e.target.checked)}
              />
              <span>
                Przekaż {count} {observationNoun(count)}: {person.employeeName}
              </span>
            </label>
          )}
          {count > 0 ? (
            <RouteLink to={`/pakiet-nastepcy?pracownik=${person.employeeId}`}>
              Przejrzyj pakiet i wyłącz pojedyncze: {person.employeeName}
            </RouteLink>
          ) : null}
        </div>
      </Card>
    </article>
  );
}
