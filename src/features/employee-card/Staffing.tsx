import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { daysBetween } from "../../../convex/rules/dates";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Field } from "../../components/ui/Field";
import { DateField } from "../../components/ui/DateField";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDemoRole } from "../../lib/demoRole";
import { formatDate } from "../../lib/format";
import { EVENT_LABEL, ISAP } from "./labels";
import { Timeline } from "./Timeline";

export type StaffingEvent = {
  kind: keyof typeof EVENT_LABEL;
  from: string;
  to?: string;
  note?: string;
};

type Kind = "long_absence" | "duties_change";
type Errors = { from?: string; to?: string };

function period(from: string, to?: string) {
  return to
    ? `${formatDate(from)}–${formatDate(to)}`
    : `od ${formatDate(from)}`;
}

function EventItem({ event }: { event: StaffingEvent }) {
  const days = event.to ? daysBetween(event.from, event.to) + 1 : undefined;
  return (
    <li className="border-divider flex flex-wrap gap-4 border-t py-4">
      <span className="w-44 shrink-0 font-bold">
        {period(event.from, event.to)}
      </span>
      <div className="min-w-0 flex-1">
        <strong>
          {EVENT_LABEL[event.kind]}
          {event.kind === "long_absence" && days ? `, ${days} dni` : ""}
        </strong>
        {event.note ? <p className="text-sm">{event.note}</p> : null}
      </div>
    </li>
  );
}

function AddEventForm({
  employeeId,
  onDone,
}: {
  employeeId: Id<"employees">;
  onDone: () => void;
}) {
  const role = useDemoRole();
  const record = useMutation(api.employees.mutations.recordStaffingEvent);
  const [kind, setKind] = useState<Kind>("long_absence");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(undefined);
    const found: Errors = {};
    if (!from) found.from = "Podaj datę początku.";
    if (from && to && to < from)
      found.to = "Data końca jest wcześniejsza niż data początku.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await record({
        actor: { role },
        employeeId,
        kind,
        from,
        ...(to ? { to } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onDone();
    } catch {
      setFailure("Nie udało się zapisać zdarzenia. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      aria-label="Nowe zdarzenie kadrowe"
      noValidate
      onSubmit={(event) => void submit(event)}
      className="border-divider mt-4 space-y-4 rounded-md border p-4"
    >
      {failure ? <StatusAlert tone="danger">{failure}</StatusAlert> : null}
      <Field label="Rodzaj zdarzenia">
        <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="long_absence">{EVENT_LABEL.long_absence}</option>
          <option value="duties_change">{EVENT_LABEL.duties_change}</option>
        </Select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <DateField label="Od" value={from} onChange={setFrom} />
          {errors.from ? (
            <p className="text-danger mt-1 text-sm font-semibold">
              {errors.from}
            </p>
          ) : null}
        </div>
        <div>
          <DateField label="Do" value={to} onChange={setTo} />
          {errors.to ? (
            <p className="text-danger mt-1 text-sm font-semibold">
              {errors.to}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-muted text-sm">
        Pole „Do” zostaw puste, jeśli koniec nieobecności nie jest znany.
      </p>
      <Field label="Notatka (opcjonalna)">
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          Zapisz zdarzenie
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

export function Staffing({
  employeeId,
  events,
  dueDate,
  adding,
  onAddingChange,
}: {
  employeeId: Id<"employees">;
  events: StaffingEvent[];
  dueDate?: string;
  adding: boolean;
  onAddingChange: (value: boolean) => void;
}) {
  return (
    <section aria-labelledby="h-nieob">
      <Card className="space-y-4">
        <h2 id="h-nieob" className="text-section font-bold">
          Nieobecności i zmiany w okresie oceny
        </h2>
        <p className="text-muted">
          Termin przesuwa tylko nieobecność, która trwa nieprzerwanie dłużej niż
          miesiąc ({" "}
          <ExternalLink href={`${ISAP}#art-81-ust-7`}>
            art. 81 ust. 7
          </ExternalLink>
          ).
        </p>
        <Timeline events={events} dueDate={dueDate} />
        {events.length === 0 ? (
          <p>Brak zapisanych zdarzeń kadrowych.</p>
        ) : (
          <ol>
            {events.map((event, index) => (
              <EventItem
                key={`${event.kind}-${event.from}-${index}`}
                event={event}
              />
            ))}
          </ol>
        )}
        {adding ? (
          <AddEventForm
            employeeId={employeeId}
            onDone={() => onAddingChange(false)}
          />
        ) : null}
      </Card>
    </section>
  );
}
