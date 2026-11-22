import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Card } from "../../components/ui/Card";
import { formatDateTime } from "../../lib/format";
import { plural } from "../../lib/plural";
import {
  CHECKLISTS,
  ITEM_CRITERIA_EXAMPLES,
  ITEM_INVITATION,
  ITEM_OBSERVATIONS,
  ITEM_OWN_NOTES,
  KIND_LABELS,
  type ConversationKind,
} from "./kinds";

const ENTRIES = { one: "wpis", few: "wpisy", many: "wpisów" };

export function Checklist({
  kind,
  employeeId,
  scheduledAt,
  observationCount,
  uncoveredCriteria,
}: {
  kind: ConversationKind;
  employeeId: string;
  scheduledAt: number | undefined;
  observationCount: number | undefined;
  uncoveredCriteria: readonly string[] | undefined;
}) {
  const items = CHECKLISTS[kind];
  const uid = useId();
  const [manual, setManual] = useState<ReadonlySet<string>>(new Set());
  const auto = new Set<string>(
    scheduledAt !== undefined ? [ITEM_INVITATION] : [],
  );
  const isDone = (item: string) => auto.has(item) || manual.has(item);
  const doneCount = items.filter(isDone).length;
  const toggle = (item: string) =>
    setManual((prev) => {
      const next = new Set(prev);
      if (!next.delete(item)) next.add(item);
      return next;
    });

  const notes: Record<string, ReactNode> = {};
  if (scheduledAt !== undefined) {
    notes[ITEM_INVITATION] =
      `Zaproszenie z plikiem .ics wysłane, termin ${formatDateTime(scheduledAt)}.`;
  }
  if (observationCount !== undefined) {
    notes[ITEM_OBSERVATIONS] = (
      <>
        {observationCount} {plural(observationCount, ENTRIES)}.{" "}
        <Link to={`/obserwacje?pracownik=${encodeURIComponent(employeeId)}`}>
          Otwórz dziennik obserwacji
        </Link>
      </>
    );
  }
  if (uncoveredCriteria?.length) {
    notes[ITEM_CRITERIA_EXAMPLES] = uncoveredCriteria
      .map((name) => `Kryterium „${name}” nie ma obserwacji.`)
      .join(" ")
      .concat(" Zapytaj o nie na rozmowie.");
  }
  notes[ITEM_OWN_NOTES] =
    "Nie widzisz jego notatek. Sam zdecyduje, co z nich powie.";

  return (
    <section aria-labelledby="h-lista">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="h-lista" className="text-section font-bold">
            Lista kontrolna: rozmowa {KIND_LABELS[kind].toLowerCase()}
          </h2>
          <span className="text-muted">
            Gotowe: {doneCount} z {items.length}
          </span>
        </div>
        <p className="text-muted text-sm">
          Lista jest tylko dla Ciebie i nie jest zapisywana.
        </p>
        <ul>
          {items.map((item, index) => (
            <li key={item}>
              <label className="border-divider flex min-h-11 items-start gap-3 border-t py-2 first:border-t-0">
                <input
                  type="checkbox"
                  className="accent-primary mt-1 size-5 shrink-0"
                  checked={isDone(item)}
                  disabled={auto.has(item)}
                  aria-labelledby={`${uid}-${index}`}
                  aria-describedby={
                    notes[item] ? `${uid}-${index}-note` : undefined
                  }
                  onChange={() => toggle(item)}
                />
                <span>
                  <span id={`${uid}-${index}`}>{item}</span>
                  {notes[item] ? (
                    <span
                      id={`${uid}-${index}-note`}
                      className="text-muted block text-sm"
                    >
                      {notes[item]}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
