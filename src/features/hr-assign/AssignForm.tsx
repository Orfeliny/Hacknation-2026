import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import type { DemoRole } from "../../lib/demoRole";
import { formatDate, today } from "../../lib/format";
import {
  byName,
  checkSupervision,
  evaluatorCandidates,
  fullName,
  reportsOf,
  validate,
  type Employee,
  type FormErrors,
  type FormValues,
  type Mode,
} from "./assign";
import { useRouteRegistered } from "../../app/index";

const EMPLOYEE_CARD_PATH = "/kadry/pracownik";

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

function SupervisionCell({ employee, on }: { employee: Employee; on: string }) {
  const { status } = checkSupervision(employee, on);
  if (status === "unknown")
    return (
      <>
        <span className="block font-semibold">Brak danych</span>
        <span className="text-muted block text-sm">Sprawdź ręcznie</span>
      </>
    );
  const enough = status === "enough";
  return (
    <>
      <span className="flex items-center gap-1 font-semibold">
        {enough ? <Icon name="success" className="size-4" /> : null}
        {enough ? "Tak" : "Nie"}
      </span>
      <span className="text-muted block text-sm">
        {enough ? "Można ocenić wcześniej" : "Oceni następca"}
      </span>
    </>
  );
}

function EmployeeTable({
  rows,
  skipped,
  on,
  onToggle,
  describedBy,
}: {
  rows: Employee[];
  skipped: ReadonlySet<string>;
  on: string;
  onToggle: (id: string) => void;
  describedBy: string;
}) {
  const cardLinks = useRouteRegistered(EMPLOYEE_CARD_PATH);
  return (
    <div
      role="region"
      aria-label="Tabela pracowników"
      tabIndex={0}
      className="overflow-x-auto"
    >
      <table
        aria-describedby={describedBy}
        className="w-full border-collapse text-left"
      >
        <caption className="sr-only">
          Pracownicy i wynik sprawdzenia nadzoru
        </caption>
        <thead>
          <tr className="border-divider border-b">
            <th scope="col" className="p-2">
              <span className="sr-only">Zaznacz</span>
            </th>
            <th scope="col" className="p-2">
              Pracownik
            </th>
            <th scope="col" className="p-2">
              Nadzór odchodzącego od
            </th>
            <th scope="col" className="p-2">
              Nadzór co najmniej 6 mies.
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((employee) => {
            const { since } = checkSupervision(employee, on);
            const name = fullName(employee);
            return (
              <tr key={employee._id} className="border-divider border-b">
                <td className="p-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    aria-label={`Objęty zmianą: ${name}`}
                    checked={!skipped.has(employee._id)}
                    onChange={() => onToggle(employee._id)}
                  />
                </td>
                <td className="p-2">
                  {cardLinks ? (
                    <Link
                      to={`${EMPLOYEE_CARD_PATH}?pracownik=${employee._id}`}
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{name}</span>
                  )}
                  <span className="text-muted block text-sm">
                    {employee.position}
                  </span>
                </td>
                <td className="p-2">{since ? formatDate(since) : "—"}</td>
                <td className="p-2">
                  <SupervisionCell employee={employee} on={on} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
}: {
  employees: Employee[];
  role: DemoRole;
}) {
  const changeSupervisor = useMutation(
    api.employees.mutations.changeSupervisor,
  );
  const setSubstitution = useMutation(api.employees.mutations.setSubstitution);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
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
  const checkOn = values.from || today().toISOString().slice(0, 10);
  const optionLabel = (e: Employee) => `${fullName(e)}, ${e.position}`;

  async function save() {
    const successor = values.successorId as Id<"employees">;
    const actor = { role };
    if (substitution) {
      await setSubstitution({
        actor,
        employeeId: values.outgoingId as Id<"employees">,
        substituteId: successor,
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
          supervisorId: successor,
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
        text: `Przypisano nowego oceniającego od ${formatDate(values.from)}: ${chosen.length} ${chosen.length === 1 ? "osoba" : "osób"}.`,
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
    setErrors(found);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
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

        <Card>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-bold">Rodzaj zmiany</legend>
            {MODE_CHOICES.map((choice) => (
              <label key={choice.value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="mode"
                  className="mt-1 size-5"
                  checked={values.mode === choice.value}
                  onChange={() => {
                    set({ mode: choice.value, skipped: new Set() });
                    setErrors({});
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

        <Card>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-bold">
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
                onChange={(e) =>
                  set({ outgoingId: e.target.value, skipped: new Set() })
                }
              >
                <option value="">Wybierz osobę</option>
                {candidates.map((e) => (
                  <option key={e._id} value={e._id}>
                    {optionLabel(e)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={substitution ? "Zastępca" : "Następca"}
              error={errors.successor}
            >
              <Select
                value={values.successorId}
                onChange={(e) => set({ successorId: e.target.value })}
              >
                <option value="">Wybierz osobę</option>
                {everyone.map((e) => (
                  <option key={e._id} value={e._id}>
                    {optionLabel(e)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={substitution ? "Zastępuje od" : "Ocenia od"}
              hint={
                substitution
                  ? undefined
                  : "Dzień wcześniej kończy się nadzór odchodzącego."
              }
              error={errors.from}
            >
              <Input
                type="date"
                value={values.from}
                onChange={(e) => set({ from: e.target.value })}
              />
            </Field>
            {substitution ? (
              <Field
                label="Zastępuje do"
                hint="Zostaw puste, jeśli koniec zastępstwa nie jest znany."
                error={errors.to}
              >
                <Input
                  type="date"
                  value={values.to}
                  onChange={(e) => set({ to: e.target.value })}
                />
              </Field>
            ) : (
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
            )}
          </fieldset>
        </Card>

        {substitution ? null : (
          <Card>
            <fieldset
              aria-describedby={
                errors.employees ? "employees-error" : "employees-hint"
              }
            >
              <legend className="mb-2 text-lg font-bold">
                Pracownicy, których dotyczy zmiana
              </legend>
              <p id="employees-hint" className="text-muted mb-3 text-sm">
                Aplikacja sprawdza, jak długo odchodzący nadzorował każdą osobę.
                Po co najmniej 6 miesiącach nadzoru może ją ocenić przed
                odejściem. Decyzję podejmuje odchodzący na swoim ekranie.
              </p>
              {values.outgoingId === "" ? (
                <p>
                  Wybierz odchodzącego oceniającego, żeby zobaczyć jego zespół.
                </p>
              ) : rows.length === 0 ? (
                <p>Ten oceniający nie ma przypisanych pracowników.</p>
              ) : (
                <EmployeeTable
                  rows={rows}
                  skipped={values.skipped}
                  on={checkOn}
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
                  className="text-danger mt-2 text-sm font-semibold"
                >
                  {errors.employees}
                </p>
              ) : null}
            </fieldset>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted max-w-xl text-sm">
            {substitution
              ? "Zastępstwo zapisuje się przy osobie zastępowanej."
              : "Zmiana trafia do historii kadrowej każdego wskazanego pracownika. Kryteria wybrane wcześniej zostają."}
          </p>
          <Button type="submit" disabled={busy}>
            {substitution ? "Zapisz zastępstwo" : "Przypisz oceniającego"}
          </Button>
        </div>
      </form>

      <aside aria-label="Co się stanie">
        <Card>
          <h2 className="mb-2 text-lg font-bold">Co się stanie po zapisaniu</h2>
          <ol className="list-decimal space-y-2 pl-5">
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
      </aside>
    </div>
  );
}
