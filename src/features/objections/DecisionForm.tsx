import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDemoRole } from "../../lib/demoRole";
import { errorMessage } from "../review/types";

type Decision = "amend" | "redo" | "rejected";

const OPTIONS: { decision: Decision; label: string; hint: string }[] = [
  {
    decision: "amend",
    label: "Zmieniam ocenę",
    hint: "Ocena wraca do sporządzenia i jest podpisywana ponownie. Pracownik zapozna się ze zmienioną oceną.",
  },
  {
    decision: "redo",
    label: "Uchylam ocenę i zlecam nową",
    hint: "Oceniający sporządzi ocenę od nowa. Ocena wraca do etapu Sporządzenie, a od nowej oceny znów przysługuje sprzeciw.",
  },
  {
    decision: "rejected",
    label: "Nie uwzględniam sprzeciwu",
    hint: "Ocena zostaje bez zmian. Pracownik dostanie pismo z pouczeniem, że może odwołać się do sądu pracy.",
  },
];

export function DecisionForm({
  reviewId,
  employeeName,
}: {
  reviewId: Id<"reviews">;
  employeeName: string;
}) {
  const actor = { role: useDemoRole() };
  const decide = useMutation(api.objections.mutations.decide);
  const [decision, setDecision] = useState<Decision | undefined>();
  const [justification, setJustification] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const decisionError = decision ? undefined : "Wybierz rozstrzygnięcie.";
  const justificationError = justification.trim()
    ? undefined
    : "Uzasadnij rozstrzygnięcie.";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!decision || justificationError) {
      setShowErrors(true);
      return;
    }
    setPending(true);
    try {
      await decide({ actor, reviewId, decision });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => void submit(e)}
      className="border-border space-y-4 border-t pt-4"
    >
      <fieldset className="space-y-2">
        <legend className="text-ink font-semibold">
          Rozstrzygnięcie w sprawie: {employeeName}
        </legend>
        {OPTIONS.map((option) => {
          const id = `decision-${reviewId}-${option.decision}`;
          return (
            <label
              key={option.decision}
              htmlFor={id}
              className="border-border flex min-h-11 items-start gap-3 rounded-md border p-3"
            >
              <input
                id={id}
                type="radio"
                name={`decision-${reviewId}`}
                className="mt-1 size-5"
                checked={decision === option.decision}
                onChange={() => setDecision(option.decision)}
              />
              <span>
                <strong className="block">{option.label}</strong>
                <span className="text-muted block">{option.hint}</span>
              </span>
            </label>
          );
        })}
        {showErrors && decisionError ? (
          <p className="text-danger text-sm font-semibold">{decisionError}</p>
        ) : null}
      </fieldset>
      <Field
        label="Uzasadnienie rozstrzygnięcia (wymagane)"
        error={showErrors ? justificationError : undefined}
      >
        <Textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        Zapisz rozstrzygnięcie
        <span className="sr-only"> w sprawie: {employeeName}</span>
      </Button>
      {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
    </form>
  );
}
