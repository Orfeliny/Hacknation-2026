import { useRef, useState, type FormEvent } from "react";
import { ConvexError } from "convex/values";
import {
  KNOWLEDGE_LIMITS,
  type KnowledgeCitation,
} from "../../../convex/lib/contracts/knowledgeDocs";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useAskKnowledge } from "../../lib/backend/knowledgeDocs";
import { useDemoRole } from "../../lib/demoRole";
import { AnswerView, type Answer } from "./AnswerView";
import { TEST_QUESTIONS } from "./questions";
import { asksForPersonRating, REFUSAL_MESSAGE } from "./refusal";
import { SourcePreview } from "./SourcePreview";

type Turn = {
  id: number;
  question: string;
  state:
    | { kind: "pending" }
    | { kind: "answer"; result: Answer }
    | { kind: "refused" }
    | { kind: "error"; message: string };
};

const EXAMPLES = [0, 1, 5].map(
  (index) => TEST_QUESTIONS[index]?.question ?? "",
);

function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string") return data.message;
    }
  }
  return "Nie udało się uzyskać odpowiedzi asystenta. Spróbuj ponownie.";
}

export function AssistantPage() {
  const ask = useAskKnowledge();
  const role = useDemoRole();
  const [question, setQuestion] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [preview, setPreview] = useState<KnowledgeCitation | undefined>();
  const nextId = useRef(0);
  const busy = turns.some((turn) => turn.state.kind === "pending");

  function update(id: number, state: Turn["state"]) {
    setTurns((all) =>
      all.map((turn) => (turn.id === id ? { ...turn, state } : turn)),
    );
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setFieldError("Wpisz pytanie.");
      return;
    }
    setFieldError(undefined);
    setQuestion("");
    const id = nextId.current++;
    if (asksForPersonRating(trimmed)) {
      setTurns((all) => [
        ...all,
        { id, question: trimmed, state: { kind: "refused" } },
      ]);
      return;
    }
    setTurns((all) => [
      ...all,
      { id, question: trimmed, state: { kind: "pending" } },
    ]);
    try {
      update(id, { kind: "answer", result: await ask({ question: trimmed }) });
    } catch (error) {
      update(id, { kind: "error", message: errorMessage(error) });
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(question);
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Kompas: asystent wiedzy</title>
      <PageHeader
        title="Kompas: asystent wiedzy"
        description="Pytania o zasady pierwszej i okresowej oceny. Odpowiedzi opierają się na bazie wiedzy i wskazują źródło."
      />
      <DemoDataNote />
      <StatusAlert tone="info" live={false}>
        Asystent nie wskazuje poziomu oceny konkretnej osoby: decyduje o niej
        przełożony.
      </StatusAlert>
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Pytanie do asystenta" error={fieldError}>
            <Textarea
              rows={3}
              value={question}
              maxLength={KNOWLEDGE_LIMITS.question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy}>
              Zapytaj asystenta
            </Button>
            <span className="text-muted">Przykłady:</span>
            {EXAMPLES.map((example) => (
              <Button
                key={example}
                variant="secondary"
                disabled={busy}
                onClick={() => void submit(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </form>
      </Card>
      <section aria-label="Rozmowa" className="flex flex-col gap-4">
        {turns.map((turn) => (
          <Card key={turn.id} className="flex flex-col gap-3">
            <h2 className="text-ink font-bold">{turn.question}</h2>
            <div aria-live="polite">
              {turn.state.kind === "pending" ? (
                <p className="text-muted">Szukam w bazie wiedzy…</p>
              ) : null}
              {turn.state.kind === "refused" ? (
                <StatusAlert tone="info">{REFUSAL_MESSAGE}</StatusAlert>
              ) : null}
              {turn.state.kind === "error" ? (
                <StatusAlert tone="danger">{turn.state.message}</StatusAlert>
              ) : null}
              {turn.state.kind === "answer" ? (
                <AnswerView
                  result={turn.state.result}
                  onOpenCitation={setPreview}
                />
              ) : null}
            </div>
          </Card>
        ))}
      </section>
      <SourcePreview
        citation={preview}
        canOpenDocument={role === "hr" || role === "admin"}
        onClose={() => setPreview(undefined)}
      />
    </div>
  );
}
