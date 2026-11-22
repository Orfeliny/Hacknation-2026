import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Link } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DateField } from "../../components/ui/DateField";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import type { DemoRole } from "../../lib/demoRole";
import { formatDate, today } from "../../lib/format";
import { plural } from "../../lib/plural";
import {
  byName,
  evaluatorCandidates,
  fullName,
  lastSupervisionDay,
  reportsOf,
  validate,
  type Employee,
  type FormErrors,
  type FormValues,
  type Mode,
} from "./assign";
import { EmployeeTable } from "./EmployeeTable";
import { useRouteRegistered } from "../../app/index";

const HR_OFFICE_PATH = "/kadry";
const PEOPLE = { one: "osobę", few: "osoby", many: "osób" };

type Outcome = { tone: "success" | "danger"; text: string };

const EMPTY: FormValues = {
  mode: "evaluator",
  outgoingId: "",
  successorId: "",
  from: "",
  to: "",
  note: "",
  skipped: new Set(),
};

const SAVE_FAILED = "Nie udało się zapisać zmiany. Spróbuj ponownie.";

function failureText(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "string") return data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    )
      return data.message;
  }
  return SAVE_FAILED;
}

const MODE_CHOICES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "evaluator",
    label: "Zmiana oceniającego",
    hint: "Wskazani pracownicy dostają nowego przełożonego.",
  },
  {
    value: "substitution",
    label: "Zastępstwo na czas nieobecności",
    hint: "Oceniający zostaje, ktoś go zastępuje.",
  },
];

export function AssignForm({
  employees,
  role,
  dueDates,
  onSubtitle,
}: {
  employees: Employee[];
  role: DemoRole;
  dueDates: ReadonlyMap<string, string>;
  onSubtitle: (text: string) => void;
}) {
  const changeSupervisor = useMutation(
    api.employees.mutations.changeSupervisor,
  );
  const setSubstitution = useMutation(api.employees.mutations.setSubstitution);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | undefined>();
  const [busy, setBusy] = useState(false);

  const substitution = values.mode === "substitution";
  const set = (patch: Partial<FormValues>) =>
    setValues((current) => ({ ...current, ...patch }));
  const candidates = evaluatorCandidates(employees);
  const everyone = [...employees].sort(byName);
  const rows = values.outgoingId
    ? reportsOf(employees, values.outgoingId, values.successorId)
    : [];
  const errors: FormErrors = submitted ? validate(values, rows.length) : {};
  const outgoing = employees.find((e) => e._id === values.outgoingId);
  const successor = employees.find((e) => e._id === values.successorId);
  const chosenCount = rows.filter((row) => !values.skipped.has(row._id)).length;
  const hrOffice = useRouteRegistered(HR_OFFICE_PATH);
  const checkOn = values.from || today().toISOString().slice(0, 10);
  const subtitle = [
    outgoing?.unit,
    values.from
      ? `${substitution ? "zastępca" : "nowy przełożony"} od ${formatDate(values.from)}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  useEffect(() => onSubtitle(subtitle), [onSubtitle, subtitle]);
  const successors = everyone.filter((e) => e._id !== values.outgoingId);
  const optionLabel = (e: Employee) => `${fullName(e)}, ${e.position}`;

  async function save() {
    const successorId = values.successorId as Id<"employees">;
    const actor = { role };
    if (substitution) {
      await setSubstitution({
        actor,
        employeeId: values.outgoingId as Id<"employees">,
        substituteId: successorId,
        from: values.from,
        ...(values.to ? { to: values.to } : {}),
      });
      setOutcome({
        tone: "success",
        text: `Zapisano zastępstwo od ${formatDate(values.from)}.`,
      });
      return;
    }
    const chosen = rows.filter((row) => !values.skipped.has(row._id));
    const failed: string[] = [];
    let firstFailure: unknown;
    for (const row of chosen) {
      try {
        await changeSupervisor({
          actor,
          employeeId: row._id,
          supervisorId: successorId,
          from: values.from,
          ...(values.note.trim() ? { note: values.note.trim() } : {}),
        });
      } catch (error) {
        failed.push(fullName(row));
        firstFailure ??= error;
      }
    }
    if (failed.length === 0) {
      setOutcome({
        tone: "success",
        text: `Przypisano nowego oceniającego od ${formatDate(values.from)}: ${chosen.length} ${plural(chosen.length, { one: "osoba", few: "osoby", many: "osób" })}.`,
      });
      set({ skipped: new Set(), note: "" });
    } else {
      setOutcome({
        tone: "danger",
        text: `Nie zapisano zmiany dla: ${failed.join(", ")}. ${failureText(firstFailure)}`,
      });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setOutcome(undefined);
    const found = validate(values, rows.length);
    setSubmitted(true);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await save();
    } catch (error) {
      setOutcome({ tone: "danger", text: failureText(error) });
    } finally {
      setBusy(false);
    }
  }

  const legend = "mb-2 px-1.5 text-section font-bold";
  const when = values.from ? formatDate(values.from) : undefined;
  const effect =
    !substitution && outgoing && successor && when && chosenCount > 0
      ? `Zmiana obejmie ${chosenCount} ${plural(chosenCount, PEOPLE)}: ${fullName(outgoing)} przestaje być ich oceniającym, a ${fullName(successor)} przejmuje nadzór od ${when}.`
      : substitution
        ? "Zastępstwo zapisuje się przy osobie zastępowanej."
        : "Zmiana trafia do historii kadrowej każdego wskazanego pracownika. Kryteria wybrane wcześniej zostają.";

  const successorField = (
    <Field
      label={substitution ? "Zastępca" : "Następca"}
      error={errors.successor}
    >
      <Select
        value={values.successorId}
        onChange={(e) => set({ successorId: e.target.value })}
      >
        <option value="">Wybierz osobę</option>
        {successors.map((e) => (
          <option key={e._id} value={e._id}>
            {optionLabel(e)}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        aria-labelledby="h-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="space-y-6"
      >
        <h2 id="h-form" className="sr-only">
          Formularz przypisania
        </h2>
        {Object.keys(errors).length > 0 ? (
          <StatusAlert tone="danger">
            Popraw zaznaczone pola, żeby zapisać zmianę.
          </StatusAlert>
        ) : null}
        {outcome ? (
          <StatusAlert tone={outcome.tone}>{outcome.text}</StatusAlert>
        ) : null}

        <Card className="px-6 py-5">
          <fieldset className="space-y-4">
            <legend className={legend}>Rodzaj zmiany</legend>
            {MODE_CHOICES.map((choice) => (
              <label key={choice.value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="mode"
                  className="accent-primary mt-1 size-5"
                  checked={values.mode === choice.value}
                  onChange={() => {
                    set({ mode: choice.value, skipped: new Set() });
                    setSubmitted(false);
                  }}
                />
                <span>
                  <strong className="block">{choice.label}</strong>
                  <span className="text-muted text-sm">{choice.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </Card>

        <Card className="px-6 py-5">
          <fieldset className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <legend className={legend}>
              {substitution
                ? "Kto zastępuje kogo"
                : "Kto odchodzi, kto przejmuje"}
            </legend>
            <Field
              label={
                substitution
                  ? "Zastępowany oceniający"
                  : "Odchodzący oceniający"
              }
              error={errors.outgoing}
            >
              <Select
                value={values.outgoingId}
                onChange={(e) => {
                  const outgoingId = e.target.value;
                  set({
                    outgoingId,
                    skipped: new Set(),
                    ...(outgoingId === values.successorId
                      ? { successorId: "" }
                      : {}),
                  });
                }}
              >
                <option value="">Wybierz osobę</option>
                {candidates.map((e) => (
                  <option key={e._id} value={e._id}>
                    {optionLabel(e)}
                  </option>
                ))}
              </Select>
            </Field>
            {substitution ? (
              successorField
            ) : (
              <Field
                label="Ostatni dzień nadzoru"
                hint="Wyliczony: dzień przed datą „Ocenia od”."
              >
                <Input
                  readOnly
                  value={
                    values.from
                      ? formatDate(lastSupervisionDay(values.from))
                      : ""
                  }
                />
              </Field>
            )}
            {substitution ? (
              <DateField
                label="Zastępuje od"
                value={values.from}
                onChange={(from) => set({ from })}
              />
            ) : (
              successorField
            )}
            {substitution ? (
              <DateField
                label="Zastępuje do"
                hint="Zostaw puste, jeśli koniec zastępstwa nie jest znany."
                value={values.to}
                onChange={(to) => set({ to })}
              />
            ) : (
              <DateField
                label="Ocenia od"
                value={values.from}
                onChange={(from) => set({ from })}
              />
            )}
            {errors.from ? (
              <p className="text-danger text-sm font-semibold md:col-span-2">
                {errors.from}
              </p>
            ) : null}
            {errors.to ? (
              <p className="text-danger text-sm font-semibold md:col-span-2">
                {errors.to}
              </p>
            ) : null}
            {substitution ? null : (
              <div className="md:col-span-2">
                <Field
                  label="Notatka do historii kadrowej"
                  hint="Opcjonalna. Trafia do zdarzenia „zmiana oceniającego”."
                >
                  <Textarea
                    rows={3}
                    value={values.note}
                    onChange={(e) => set({ note: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </fieldset>
        </Card>

        {substitution ? null : (
          <Card className="pt-5 pb-2">
            <fieldset
              className="space-y-3"
              aria-describedby={
                errors.employees ? "employees-error" : "employees-hint"
              }
            >
              <legend className={`${legend} ml-4`}>
                Pracownicy, których dotyczy zmiana
              </legend>
              <p id="employees-hint" className="text-muted max-w-[76ch] px-6">
                Aplikacja sprawdza, jak długo odchodzący nadzorował każdą osobę.
                Po co najmniej 6 miesiącach nadzoru może ją ocenić przed
                odejściem. Decyzję podejmuje odchodzący na swoim ekranie.
              </p>
              {values.outgoingId === "" ? (
                <p className="px-6 pb-3">
                  Wybierz odchodzącego oceniającego, żeby zobaczyć jego zespół.
                </p>
              ) : rows.length === 0 ? (
                <p className="px-6 pb-3">
                  Ten oceniający nie ma przypisanych pracowników.
                </p>
              ) : (
                <EmployeeTable
                  rows={rows}
                  skipped={values.skipped}
                  on={checkOn}
                  dueDates={dueDates}
                  describedBy="employees-hint"
                  onToggle={(id) => {
                    const next = new Set(values.skipped);
                    if (!next.delete(id)) next.add(id);
                    set({ skipped: next });
                  }}
                />
              )}
              {errors.employees ? (
                <p
                  id="employees-error"
                  className="text-danger px-6 pb-3 text-sm font-semibold"
                >
                  {errors.employees}
                </p>
              ) : null}
            </fieldset>
          </Card>
        )}

        <div className="border-ink flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border-2 bg-white px-6 py-4">
          <p id="skutek" className="max-w-[60ch]">
            {effect}
          </p>
          <Button type="submit" disabled={busy} aria-describedby="skutek">
            {substitution ? "Zapisz zastępstwo" : "Przypisz oceniającego"}
          </Button>
        </div>
      </form>

      <aside aria-label="Co się stanie" className="space-y-6">
        <Card className="px-6 py-5">
          <h2 className="text-section mb-3 font-bold">
            Co się stanie po zapisaniu
          </h2>
          <ol className="list-decimal space-y-2.5 pl-5">
            {substitution ? (
              <>
                <li>Zastępca jest zapisany przy osobie zastępowanej.</li>
                <li>Zastępstwo obowiązuje od wskazanej daty.</li>
              </>
            ) : (
              <>
                <li>
                  Wskazani pracownicy dostają nowego oceniającego od podanej
                  daty.
                </li>
                <li>
                  Poprzedni oceniający zostaje w historii kadrowej pracownika.
                </li>
                <li>
                  Osoby z nadzorem krótszym niż 6 miesięcy oceni następca za
                  cały okres.
                </li>
              </>
            )}
          </ol>
        </Card>
        <section aria-labelledby="h-wiecej" className="px-1">
          <h3 id="h-wiecej" className="mb-1 text-[17px] font-bold">
            Inne sprawy kadr
          </h3>
          <p className="text-muted">
            Przypomnienia o zapoznaniu, pisma o przesunięciu terminu i fikcję
            zapoznania obsłużysz na{" "}
            {hrOffice ? (
              <Link to={HR_OFFICE_PATH}>pulpicie kadr</Link>
            ) : (
              "pulpicie kadr"
            )}
            .
          </p>
        </section>
      </aside>
    </div>
  );
}
