import { useState, type FormEvent } from "react";
import {
  KNOWLEDGE_LIMITS,
  type KnowledgeCitation,
} from "../../../convex/lib/contracts/knowledgeDocs";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useAskKnowledge } from "../../lib/backend/knowledgeDocs";

type Answer = {
  answer: string | null;
  citations: KnowledgeCitation[];
  possibleConflict?: boolean | undefined;
};

function CitationGroup({
  heading,
  items,
}: {
  heading: string;
  items: KnowledgeCitation[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h4 className="text-ink font-semibold">{heading}</h4>
      <ul className="list-disc pl-5">
        {items.map((item) => (
          <li key={`${item.title}-${item.locator}`}>
            {item.title}, {item.locator}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AskSample() {
  const ask = useAskKnowledge();
  const [question, setQuestion] = useState("Kto zatwierdza wniosek o urlop?");
  const [error, setError] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);
  const [response, setResponse] = useState<Answer | undefined>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) {
      setError("Wpisz pytanie.");
      return;
    }
    setError(undefined);
    setFailed(false);
    try {
      setResponse(await ask({ question: question.trim() }));
    } catch {
      setResponse(undefined);
      setFailed(true);
    }
  }

  return (
    <Card>
      <form
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <h2 className="text-ink text-xl font-bold">
          Przykładowa odpowiedź asystenta
        </h2>
        <p className="text-muted">
          Sprawdź, jak asystent cytuje dokumenty urzędu osobno od przepisów.
        </p>
        <Field label="Pytanie do asystenta" error={error}>
          <Input
            value={question}
            maxLength={KNOWLEDGE_LIMITS.question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </Field>
        <div>
          <Button type="submit">Zapytaj asystenta</Button>
        </div>
      </form>
      {failed ? (
        <StatusAlert tone="danger" className="mt-4">
          Nie udało się uzyskać odpowiedzi asystenta. Spróbuj ponownie.
        </StatusAlert>
      ) : null}
      {response ? (
        <div className="mt-4 flex flex-col gap-3" aria-live="polite">
          <h3 className="text-ink text-lg font-bold">Odpowiedź asystenta</h3>
          <p>{response.answer ?? "Nie znalazłem tego w bazie wiedzy."}</p>
          {response.possibleConflict ? (
            <StatusAlert tone="warning">
              Źródła krajowe i urzędu mogą się różnić. Sprawdź to ręcznie.
            </StatusAlert>
          ) : null}
          <CitationGroup
            heading="Dokumenty urzędu"
            items={response.citations.filter((c) => c.kind === "office")}
          />
          <CitationGroup
            heading="Przepisy"
            items={response.citations.filter((c) => c.kind === "law")}
          />
        </div>
      ) : null}
    </Card>
  );
}
