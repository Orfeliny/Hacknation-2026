import { Link } from "react-router";
import type { KnowledgeCitation } from "../../../convex/lib/contracts/knowledgeDocs";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

export function SourcePreview({
  citation,
  canOpenDocument,
  onClose,
}: {
  citation: KnowledgeCitation | undefined;
  canOpenDocument: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={citation !== undefined}
      onClose={onClose}
      title="Źródło odpowiedzi"
      footer={
        <>
          {citation?.documentId && canOpenDocument ? (
            <Link
              to="/ustawienia/dokumenty"
              className="text-primary underline"
              onClick={onClose}
            >
              Otwórz dokument w panelu dokumentów
            </Link>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
        </>
      }
    >
      {citation ? (
        <>
          <p className="text-muted">
            {citation.kind === "office" ? "Dokument urzędu" : "Przepis"}
          </p>
          <p className="font-semibold">{citation.title}</p>
          <p>Miejsce w źródle: {citation.locator}</p>
          {citation.excerpt ? (
            <blockquote className="border-border border-l-4 pl-3">
              {citation.excerpt}
            </blockquote>
          ) : (
            <p className="text-muted">
              Fragment źródła nie jest dostępny. Sprawdź go w dokumencie.
            </p>
          )}
        </>
      ) : null}
    </Modal>
  );
}
