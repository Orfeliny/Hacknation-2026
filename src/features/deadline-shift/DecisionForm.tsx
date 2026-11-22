import { useState, type FormEvent } from "react";
import {
  SHIFT_LIMITS,
  type ShiftRequest,
} from "../../../convex/lib/contracts/deadlineShift";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDecideShift } from "../../lib/backend/deadlineShift";
import {
  validateDecision,
  type DecisionErrors,
  type DecisionInput,
} from "./schema";

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(undefined);
    const result = validateDecision(input, shift.currentDueDate);
    if (!result.ok) {
      setErrors(result.errors);
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
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-labelledby="decision-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="decision-heading" className="text-ink text-xl font-bold">
        Decyzja
      </h2>
      {!shift.shiftAllowed ? (
        <StatusAlert tone="warning" live={false}>
          {shift.shiftBlockedReason ??
            "Przesunięcie terminu jest w tej chwili niedozwolone."}
        </StatusAlert>
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
      {input.accepted === "yes" ? (
        <Field label="Nowy termin" error={errors.newDate}>
          <Input
            type="date"
            value={input.newDate}
            onChange={(event) =>
              setInput({ ...input, newDate: event.target.value })
            }
          />
        </Field>
      ) : null}
      <Field
        label="Uzasadnienie"
        hint="Trafi do pisma dla pracownika."
        error={errors.justification}
      >
        <Textarea
          rows={4}
          maxLength={SHIFT_LIMITS.justification}
          value={input.justification}
          onChange={(event) =>
            setInput({ ...input, justification: event.target.value })
          }
        />
      </Field>
      {failure ? <StatusAlert tone="danger">{failure}</StatusAlert> : null}
      <div>
        <Button type="submit" disabled={busy}>
          Zapisz decyzję i przekaż do kadr
        </Button>
      </div>
    </form>
  );
}
