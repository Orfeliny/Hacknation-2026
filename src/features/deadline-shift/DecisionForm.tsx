import { useRef, useState, type FormEvent } from "react";
import {
  SHIFT_LIMITS,
  type ShiftRequest,
} from "../../../convex/lib/contracts/deadlineShift";
import { RouteLink } from "../../app/index";
import { Button } from "../../components/ui/Button";
import { DateField } from "../../components/ui/DateField";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Field } from "../../components/ui/Field";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDecideShift } from "../../lib/backend/deadlineShift";
import {
  validateDecision,
  type DecisionErrors,
  type DecisionInput,
} from "./schema";
import { legalBasis } from "./labels";

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Nie udało się zapisać decyzji. Spróbuj ponownie.";
}

export function DecisionForm({
  shift,
  onSaved,
}: {
  shift: ShiftRequest;
  onSaved: () => void;
}) {
  const decide = useDecideShift();
  const [input, setInput] = useState<DecisionInput>({
    accepted: "",
    justification: "",
    newDate: shift.proposedDate ?? "",
  });
  const [errors, setErrors] = useState<DecisionErrors>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const legal = legalBasis(shift.basis);

  const focusFirstInvalid = (found: DecisionErrors) => {
    const name = (["accepted", "newDate", "justification"] as const).find(
      (key) => found[key],
    );
    formRef.current
      ?.querySelector<HTMLElement>(
        name === "accepted"
          ? "input[name=accepted]:not(:disabled)"
          : `[name=${name}]`,
      )
      ?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(undefined);
    const result = validateDecision(input, shift.currentDueDate);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstInvalid(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await decide({
        reviewId: shift.reviewId,
        changeIndex: shift.changeIndex,
        accepted: result.accepted,
        justification: result.justification,
        ...(result.newDate ? { newDate: result.newDate } : {}),
      });
      onSaved();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-labelledby="decision-heading"
      className="border-border flex min-w-0 flex-[999_1_35rem] flex-col gap-5 rounded-xl border bg-white p-6"
    >
      <h2 id="decision-heading" className="text-ink text-xl font-bold">
        Decyzja
      </h2>
      {shift.employeeReason ? (
        <div>
          <p className="text-ink font-semibold">
            Powód podany przez pracownika
          </p>
          <p className="bg-surface-muted mt-1 rounded-lg px-3.5 py-3 whitespace-pre-line">
            {shift.employeeReason}
          </p>
        </div>
      ) : null}
      <div>
        <p className="text-ink font-semibold">Podstawa prawna</p>
        <p>{legal.text}</p>
        <p className="text-muted text-sm">
          <ExternalLink href={legal.href}>{legal.anchorLabel}</ExternalLink>.
          Kadry sprawdzą podstawę przed wysłaniem pisma.
        </p>
      </div>
      {!shift.shiftAllowed ? (
        <div id="shift-blocked">
          <StatusAlert tone="warning" live={false}>
            {shift.shiftBlockedReason ??
              "Przesunięcie terminu jest w tej chwili niedozwolone."}
          </StatusAlert>
        </div>
      ) : null}
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.accepted ? "accepted-error" : undefined}
      >
        <legend className="text-ink font-semibold">Rozstrzygnięcie</legend>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="accepted"
            value="yes"
            disabled={!shift.shiftAllowed}
            aria-describedby={shift.shiftAllowed ? undefined : "shift-blocked"}
            checked={input.accepted === "yes"}
            onChange={() => setInput({ ...input, accepted: "yes" })}
            className="size-5"
          />
          Uwzględniam wniosek
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="accepted"
            value="no"
            checked={input.accepted === "no"}
            onChange={() => setInput({ ...input, accepted: "no" })}
            className="size-5"
          />
          Nie uwzględniam wniosku
        </label>
        {errors.accepted ? (
          <p id="accepted-error" className="text-danger text-sm font-semibold">
            {errors.accepted}
          </p>
        ) : null}
      </fieldset>
      <div className="flex flex-col gap-1">
        <DateField
          label="Nowy termin"
          name="newDate"
          value={input.newDate}
          onChange={(newDate) => setInput({ ...input, newDate })}
        />
        {errors.newDate ? (
          <p className="text-danger text-sm font-semibold">{errors.newDate}</p>
        ) : null}
      </div>
      <Field
        label={
          <>
            Uzasadnienie{" "}
            <span className="text-muted font-normal">(trafi do pisma)</span>
          </>
        }
        error={errors.justification}
      >
        <Textarea
          name="justification"
          rows={3}
          maxLength={SHIFT_LIMITS.justification}
          value={input.justification}
          onChange={(event) =>
            setInput({ ...input, justification: event.target.value })
          }
        />
      </Field>
      {failure ? <StatusAlert tone="danger">{failure}</StatusAlert> : null}
      <div className="border-border flex flex-col gap-1.5 rounded-xl border p-4">
        <p className="text-ink font-semibold">
          Pisemna informacja dla pracownika
        </p>
        <p className="text-muted">
          {shift.employeeName} dostanie pismo z rozstrzygnięciem, uzasadnieniem
          i nowym terminem. Pismo przygotowują i wysyłają kadry. Dopóki go nie
          wyślą, termin się nie zmienia.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          Zapisz decyzję <span className="sr-only">i przekaż do kadr</span>
        </Button>
        <RouteLink
          to="/pulpit"
          className="border-border text-ink rounded-md border px-4 font-semibold no-underline"
        >
          Wróć na pulpit
        </RouteLink>
      </div>
    </form>
  );
}
