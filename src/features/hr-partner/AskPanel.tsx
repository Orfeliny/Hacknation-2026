import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useDemoRole } from "../../lib/demoRole";
import { PromptPanel } from "../audit/PromptPanel";
import { MAX_QUESTION_LENGTH } from "./labels";

type Answer = {
  answer: string;
  suggestions: string[];
  interactionId?: Id<"aiInteractions">;
};

export function AskPanel({
  team,
}: {
  team: { id: Id<"employees">; name: string }[];
}) {
  const actor = { role: useDemoRole() };
  const ask = useAction(api.hrPartner.actions.ask);
  const [employeeId, setEmployeeId] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const trimmed = question.trim();

  async function submit() {
    setBusy(true);
    setMessage(null);
    setAnswer(null);
    try {
      const result = await ask({
        actor,
        employeeId: employeeId ? (employeeId as Id<"employees">) : undefined,
        question: trimmed,
      });
      if (result.ok) {
        setAnswer({
          answer: result.answer,
          suggestions: result.suggestions,
          interactionId: result.interactionId,
        });
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("Nie udało się zapytać HR partnera. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-ink text-xl font-bold">Zapytaj HR partnera</h2>
      <p className="text-muted">
        Opisz sytuację w zespole. Imię i nazwisko pracownika są zastępowane
        znacznikiem, zanim pytanie trafi do modelu.
      </p>
      <div className="space-y-1">
        <label htmlFor="hr-ask-employee" className="block font-semibold">
          Dotyczy pracownika (opcjonalnie)
        </label>
        <select
          id="hr-ask-employee"
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          className="border-border w-full rounded-md border bg-white px-3 py-2"
        >
          <option value="">Pytanie ogólne</option>
          {team.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="hr-ask-question" className="block font-semibold">
          Pytanie
        </label>
        <textarea
          id="hr-ask-question"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          rows={4}
          onChange={(event) => setQuestion(event.target.value)}
          className="border-border w-full rounded-md border px-3 py-2"
        />
        <p className="text-muted">
          {question.length} / {MAX_QUESTION_LENGTH} znaków
        </p>
      </div>
      <Button disabled={busy || trimmed === ""} onClick={() => void submit()}>
        {busy ? "Pytam…" : "Zapytaj"}
      </Button>
      {message && (
        <p role="alert" className="text-danger font-semibold">
          {message}
        </p>
      )}
      <div aria-live="polite">
        {answer && (
          <div className="bg-surface-muted space-y-2 rounded-md p-3">
            <p className="whitespace-pre-line">{answer.answer}</p>
            {answer.suggestions.length > 0 && (
              <ul className="list-disc pl-5">
                {answer.suggestions.map((suggestion, index) => (
                  <li key={`${index}-${suggestion}`}>{suggestion}</li>
                ))}
              </ul>
            )}
            {answer.interactionId && (
              <PromptPanel interactionId={answer.interactionId} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
