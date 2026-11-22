import type { Doc } from "../../../convex/_generated/dataModel";
import { addMonths, compareDates } from "../../../convex/rules/dates";
import { RULES_2016 } from "../../../convex/rules/pack2016";

export type Employee = Doc<"employees">;
export type Mode = "evaluator" | "substitution";

export type FormValues = {
  mode: Mode;
  outgoingId: string;
  successorId: string;
  from: string;
  to: string;
  note: string;
  skipped: ReadonlySet<string>;
};

export type FormErrors = Partial<
  Record<"outgoing" | "successor" | "from" | "to" | "employees", string>
>;

export type SupervisionCheck = {
  since: string | undefined;
  status: "enough" | "short" | "unknown";
};

export const fullName = (e: Pick<Employee, "firstName" | "lastName">) =>
  `${e.firstName} ${e.lastName}`;

export const byName = (a: Employee, b: Employee) =>
  fullName(a).localeCompare(fullName(b), "pl");

export function reportsOf(
  employees: readonly Employee[],
  supervisorId: string,
  exceptId?: string,
): Employee[] {
  return employees
    .filter((e) => e.supervisorId === supervisorId && e._id !== exceptId)
    .sort(byName);
}

export function evaluatorCandidates(employees: readonly Employee[]) {
  const supervisors = new Set(employees.map((e) => e.supervisorId));
  return employees.filter((e) => supervisors.has(e._id)).sort(byName);
}

// The only record of when the current evaluator took over is the last evaluator_change event.
export function checkSupervision(
  employee: Employee,
  on: string,
): SupervisionCheck {
  const since = (employee.staffingEvents ?? [])
    .filter((event) => event.kind === "evaluator_change" && event.from <= on)
    .map((event) => event.from)
    .sort()
    .at(-1);
  if (!since) return { since: undefined, status: "unknown" };
  const enough =
    compareDates(on, addMonths(since, RULES_2016.deadlineChangeAfterMonths)) >=
    0;
  return { since, status: enough ? "enough" : "short" };
}

export function validate(values: FormValues, shown: number): FormErrors {
  const substitution = values.mode === "substitution";
  const errors: FormErrors = {};
  if (!values.outgoingId)
    errors.outgoing = substitution
      ? "Wybierz oceniającego, którego ktoś zastąpi."
      : "Wybierz odchodzącego oceniającego.";
  if (!values.successorId)
    errors.successor = substitution ? "Wybierz zastępcę." : "Wybierz następcę.";
  else if (values.successorId === values.outgoingId)
    errors.successor = substitution
      ? "Zastępca musi być inną osobą niż zastępowany oceniający."
      : "Następca musi być inną osobą niż odchodzący oceniający.";
  if (!values.from) errors.from = "Podaj datę, od której zmiana obowiązuje.";
  if (substitution && values.to && values.from && values.to < values.from)
    errors.to = "Data końca jest wcześniejsza niż data początku.";
  if (!substitution && shown === 0)
    errors.employees = "Brak pracowników do przypisania.";
  else if (!substitution && shown > 0 && values.skipped.size >= shown)
    errors.employees = "Zaznacz co najmniej jednego pracownika.";
  return errors;
}
