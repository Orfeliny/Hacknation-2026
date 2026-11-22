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

const OPTIONS: {
  decision: Decision;
  label: string;
  hint: (evaluator: string) => string;
}[] = [
  {
    decision: "amend",
    label: "Zmieniam ocenę",
    hint: () =>
      "Ocena wraca do sporządzenia i jest podpisywana ponownie. Pracownik zapozna się ze zmienioną oceną.",
  },
  {
    decision: "redo",
    label: "Uchylam ocenę i zlecam nową",
    hint: (evaluator) =>
      `${evaluator} sporządzi ocenę od nowa. Ocena wraca do etapu Sporządzenie, a od nowej oceny znów przysługuje sprzeciw.`,
  },
  {
    decision: "rejected",
    label: "Nie uwzględniam sprzeciwu",
    hint: () =>
      "Ocena zostaje bez zmian. Pracownik dostanie pismo z pouczeniem, że może odwołać się do sądu pracy.",
  },
];

export function DecisionForm({
  reviewId,
  employeeName,
  evaluatorName,
}: {
  reviewId: Id<"reviews">;
  employeeName?: string;
  evaluatorName?: string;
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
  const justificationId = `justification-${reviewId}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!decision || justificationError) {
      setShowErrors(true);
      const first = decision
        ? justificationId
        : `decision-${reviewId}-${OPTIONS[0]?.decision}`;
      document.getElementById(first)?.focus();
      return;
    }
    setPending(true);
    try {
      await decide({
        actor,
        reviewId,
        decision,
        justification: justification.trim(),
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="space-y-4">
      <fieldset
        className="space-y-2"
        aria-describedby={
          showErrors && decisionError ? `${reviewId}-decision-error` : undefined
        }
      >
        <legend className="text-ink font-semibold">
          Wybierz rozstrzygnięcie. Opis pod każdą opcją mówi, kto działa dalej.
          {employeeName ? (
            <span className="sr-only"> Sprawa: {employeeName}.</span>
          ) : null}
        </legend>
        {OPTIONS.map((option) => {
          const id = `decision-${reviewId}-${option.decision}`;
          return (
            <label
              key={option.decision}
              htmlFor={id}
              className="border-border has-[:checked]:border-ink flex min-h-11 items-start gap-3 rounded-[10px] border px-4 py-3.5 has-[:checked]:border-2"
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
                <span className="text-muted block">
                  {option.hint(evaluatorName ?? "Oceniający")}
                </span>
              </span>
            </label>
          );
        })}
        {showErrors && decisionError ? (
          <p
            id={`${reviewId}-decision-error`}
            className="text-danger text-sm font-semibold"
          >
            {decisionError}
          </p>
        ) : null}
      </fieldset>
      <Field
        label={
          <>
            Uzasadnienie rozstrzygnięcia (wymagane)
            {employeeName ? (
              <span className="sr-only"> w sprawie: {employeeName}</span>
            ) : null}
          </>
        }
        error={showErrors ? justificationError : undefined}
      >
        <Textarea
          id={justificationId}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        Zapisz rozstrzygnięcie
        {employeeName ? (
          <span className="sr-only"> w sprawie: {employeeName}</span>
        ) : null}
      </Button>
      {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
    </form>
  );
}
