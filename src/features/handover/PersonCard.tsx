import { Icon } from "../../components/ui/Icon";
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
    <article
      aria-labelledby={headingId}
      className="border-border grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 rounded-xl border bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-ink text-lg font-bold">
          {person.employeeName}
        </h3>
        <p className="text-muted">
          {person.position}. Nadzorujesz tę osobę od {months}{" "}
          {monthsNoun(months)}.
        </p>
        {person.early.available ? (
          <p className="text-success flex items-center gap-2 font-bold">
            <Icon name="success" />
            Możesz ocenić wcześniej
          </p>
        ) : (
          <p className="text-muted">Oceni następca.</p>
        )}
        <p className="text-muted text-sm">{person.early.reason}</p>
        {person.dueDate ? (
          <p className="text-muted text-sm">
            Termin oceny: {formatDate(person.dueDate)}
          </p>
        ) : null}
      </div>
      <div>
        {person.early.available ? (
          <RatingScale
            legend="Ocena"
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
      </div>
      <div className="flex flex-col">
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
              Przekaż {count} {observationNoun(count)}
              <span className="sr-only">: {person.employeeName}</span>
            </span>
          </label>
        )}
        {count > 0 ? (
          <RouteLink to={`/pakiet-nastepcy?pracownik=${person.employeeId}`}>
            Przejrzyj pakiet
            <span className="sr-only">
              {" "}
              i wyłącz pojedyncze: {person.employeeName}
            </span>
          </RouteLink>
        ) : null}
      </div>
    </article>
  );
}
