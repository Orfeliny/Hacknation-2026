import type { KnowledgeCitation } from "../../../convex/lib/contracts/knowledgeDocs";
import { Button } from "../../components/ui/Button";
import { StatusAlert } from "../../components/ui/StatusAlert";

export type Answer = {
  answer: string | null;
  citations: KnowledgeCitation[];
  possibleConflict?: boolean | undefined;
};

export const NOT_FOUND_MESSAGE = "Nie znalazłem tego w bazie wiedzy.";

function CitationGroup({
  heading,
  items,
  onOpen,
}: {
  heading: string;
  items: KnowledgeCitation[];
  onOpen: (citation: KnowledgeCitation) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-ink font-semibold">{heading}</h3>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={`${item.title}-${item.locator}-${index}`}>
            <Button variant="ghost" onClick={() => onOpen(item)}>
              {item.title}, {item.locator}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AnswerView({
  result,
  onOpenCitation,
}: {
  result: Answer;
  onOpenCitation: (citation: KnowledgeCitation) => void;
}) {
  if (result.answer === null) {
    return <p>{NOT_FOUND_MESSAGE}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <p>{result.answer}</p>
      {result.possibleConflict ? (
        <StatusAlert tone="warning">
          Możliwy konflikt źródeł: dokument urzędu i przepisy krajowe mogą się
          różnić. Zweryfikuj ręcznie.
        </StatusAlert>
      ) : null}
      <CitationGroup
        heading="Dokumenty urzędu"
        items={result.citations.filter((c) => c.kind === "office")}
        onOpen={onOpenCitation}
      />
      <CitationGroup
        heading="Przepisy"
        items={result.citations.filter((c) => c.kind === "law")}
        onOpen={onOpenCitation}
      />
    </div>
  );
}
