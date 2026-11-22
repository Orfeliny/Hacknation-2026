import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import {
  OBSERVATION_HINT,
  OBSERVATION_MAX_LENGTH,
  observationText,
} from "../../../convex/observations/limits";
import {
  CRITERIA,
  SENTIMENTS,
  emptyDraft,
  isoToday,
  type Draft,
} from "./labels";

export function ObservationForm({
  employeeName,
  initial,
  editing,
  onSubmit,
  onCancel,
}: {
  employeeName: string;
  initial: Draft;
  editing: boolean;
  onSubmit: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const keepCriterion = editing && initial.criterionId !== undefined;

  const textError = (() => {
    const parsed = observationText.safeParse(draft.text);
    return parsed.success ? undefined : parsed.error.issues[0]?.message;
  })();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (textError) {
      setError(textError);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ ...draft, text: draft.text.trim() });
      if (!editing) setDraft(emptyDraft());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać wpisu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form
        aria-labelledby="obs-form-title"
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-5"
        noValidate
      >
        <h2 id="obs-form-title" className="text-ink text-xl font-bold">
          {editing ? "Edytuj obserwację" : "Nowa obserwacja"}
        </h2>
        <Field
          label="Co zaobserwowano?"
          hint={
            <>
              {OBSERVATION_HINT} Notatek pracownika tu nie widać. Mobbing
              zgłasza się w osobnej procedurze urzędu.
            </>
          }
          error={error && textError ? error : undefined}
        >
          <Textarea
            autoFocus={editing}
            value={draft.text}
            maxLength={OBSERVATION_MAX_LENGTH + 200}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
        </Field>
        <p className="text-muted text-sm">
          <strong className="text-ink">Kto widzi ten wpis:</strong> Ty i kadry.{" "}
          {employeeName} nigdy go nie zobaczy. Następca zobaczy go tylko za
          Twoją zgodą, przy zmianie oceniającego.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kryterium">
            <Select
              value={draft.criterionId ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, criterionId: e.target.value || undefined })
              }
            >
              {!keepCriterion && <option value="">Bez kryterium</option>}
              {CRITERIA.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data obserwacji">
            <Input
              type="date"
              value={draft.date}
              max={isoToday()}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
        </div>
        <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <legend className="text-ink mb-1 font-semibold">Rodzaj</legend>
          {SENTIMENTS.map((s) => (
            <label key={s.value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="obs-sentiment"
                className="size-5"
                checked={draft.sentiment === s.value}
                onChange={() => setDraft({ ...draft, sentiment: s.value })}
              />
              {s.label}
            </label>
          ))}
        </fieldset>
        {error && !textError ? (
          <StatusAlert tone="danger">{error}</StatusAlert>
        ) : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {editing ? "Zapisz zmiany we wpisie" : "Zapisz obserwację"}
          </Button>
          {editing ? (
            <Button variant="secondary" onClick={onCancel}>
              Anuluj edycję
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
