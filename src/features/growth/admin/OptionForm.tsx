import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { parseOptionInput } from "../../../../convex/growth/adminValidation";
import {
  DEVELOPMENT_COSTS,
  DEVELOPMENT_COST_LABELS,
  DEVELOPMENT_FORMS,
  DEVELOPMENT_FORM_LABELS,
  DEVELOPMENT_LEVELS,
  DEVELOPMENT_LEVEL_LABELS,
  type DevelopmentCost,
  type DevelopmentForm,
  type DevelopmentLevel,
} from "../../../../convex/growth/constants";
import { RULES_2016 } from "../../../../convex/rules/pack2016";
import { Button } from "../../../components/ui/Button";
import { useDemoRole } from "../../../lib/demoRole";
import { Field, FormError, TextField } from "./fields";
import { messageOf, selectClass, textareaClass } from "./helpers";

type Option = Doc<"developmentOptions">;
type CriterionId = Option["criterionIds"][number];

export function OptionForm({
  option,
  onDone,
}: {
  option?: Option;
  onDone: () => void;
}) {
  const role = useDemoRole();
  const save = useMutation(api.growth.admin.saveOption);
  const [title, setTitle] = useState(option?.title ?? "");
  const [description, setDescription] = useState(option?.description ?? "");
  const [form, setForm] = useState<DevelopmentForm>(
    option?.form ?? "szkolenie",
  );
  const [level, setLevel] = useState<DevelopmentLevel>(
    option?.level ?? "podstawowy",
  );
  const [cost, setCost] = useState<DevelopmentCost>(
    option?.cost ?? "brak_danych",
  );
  const [criterionIds, setCriterionIds] = useState<CriterionId[]>(
    option?.criterionIds ?? [],
  );
  const [costNote, setCostNote] = useState(option?.costNote ?? "");
  const [provider, setProvider] = useState(option?.provider ?? "");
  const [url, setUrl] = useState(option?.url ?? "");
  const [durationNote, setDurationNote] = useState(option?.durationNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: CriterionId) {
    setCriterionIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const fields = {
      title,
      description,
      criterionIds,
      costNote,
      provider,
      url,
      durationNote,
    };
    try {
      parseOptionInput(fields);
    } catch (e) {
      setError(messageOf(e));
      return;
    }
    setBusy(true);
    try {
      await save({
        actor: { role },
        ...(option ? { optionId: option._id } : {}),
        ...fields,
        form,
        level,
        cost,
      });
      onDone();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label={option ? "Edycja wpisu katalogu" : "Nowy wpis katalogu"}
      className="space-y-3"
      noValidate
    >
      <TextField
        id="opt-title"
        label="Tytuł"
        value={title}
        onChange={setTitle}
      />
      <Field id="opt-description" label="Opis">
        <textarea
          id="opt-description"
          className={textareaClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="opt-form" label="Forma">
          <select
            id="opt-form"
            className={selectClass}
            value={form}
            onChange={(e) => setForm(e.target.value as DevelopmentForm)}
          >
            {DEVELOPMENT_FORMS.map((value) => (
              <option key={value} value={value}>
                {DEVELOPMENT_FORM_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="opt-level" label="Poziom">
          <select
            id="opt-level"
            className={selectClass}
            value={level}
            onChange={(e) => setLevel(e.target.value as DevelopmentLevel)}
          >
            {DEVELOPMENT_LEVELS.map((value) => (
              <option key={value} value={value}>
                {DEVELOPMENT_LEVEL_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="opt-cost" label="Koszt">
          <select
            id="opt-cost"
            className={selectClass}
            value={cost}
            onChange={(e) => setCost(e.target.value as DevelopmentCost)}
          >
            {DEVELOPMENT_COSTS.map((value) => (
              <option key={value} value={value}>
                {DEVELOPMENT_COST_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Kryteria oceny</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {RULES_2016.catalog.map((entry) => (
            <label key={entry.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={criterionIds.includes(entry.id)}
                onChange={() => toggle(entry.id)}
              />
              {entry.name}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        id="opt-provider"
        label="Organizator (opcjonalnie)"
        value={provider}
        onChange={setProvider}
      />
      <TextField
        id="opt-url"
        label="Adres strony (opcjonalnie)"
        hint="Tylko adres zaczynający się od https://."
        value={url}
        onChange={setUrl}
      />
      <TextField
        id="opt-cost-note"
        label="Uwaga o koszcie (opcjonalnie)"
        value={costNote}
        onChange={setCostNote}
      />
      <TextField
        id="opt-duration"
        label="Czas trwania (opcjonalnie)"
        value={durationNote}
        onChange={setDurationNote}
      />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Zapisz wpis
        </Button>
        <Button type="button" className="bg-slate-600" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
