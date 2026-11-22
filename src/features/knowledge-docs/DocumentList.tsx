import { useState } from "react";
import type { KnowledgeDocumentRow } from "../../../convex/lib/contracts/knowledgeDocs";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useRemoveDocument } from "../../lib/backend/knowledgeDocs";
import { formatDate } from "../../lib/format";
import { scopeLabel, STATUS_LABELS } from "./labels";

export function DocumentList({ rows }: { rows: KnowledgeDocumentRow[] }) {
  const remove = useRemoveDocument();
  const [confirming, setConfirming] = useState<string | undefined>();
  const [removed, setRemoved] = useState<string | undefined>();

  async function confirmRemove(row: KnowledgeDocumentRow) {
    await remove({ documentId: row.documentId });
    setConfirming(undefined);
    setRemoved(row.title);
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-ink text-xl font-bold">Dokumenty w bazie wiedzy</h2>
      {removed ? (
        <StatusAlert tone="success">Usunięto dokument „{removed}”.</StatusAlert>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-muted">
          Nie dodano jeszcze żadnego dokumentu urzędu.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Dokumenty wewnętrzne urzędu: zakres, status indeksowania i data
            </caption>
            <thead>
              <tr className="border-border border-b">
                <th scope="col" className="py-2 pr-3">
                  Dokument
                </th>
                <th scope="col" className="py-2 pr-3">
                  Zakres
                </th>
                <th scope="col" className="py-2 pr-3">
                  Status indeksowania
                </th>
                <th scope="col" className="py-2 pr-3">
                  Dodano
                </th>
                <th scope="col" className="py-2">
                  Działania
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.documentId}
                  className="border-border border-b align-top"
                >
                  <th scope="row" className="py-3 pr-3 font-semibold">
                    {row.title}
                    <span className="text-muted block text-sm font-normal">
                      {row.fileName}
                    </span>
                  </th>
                  <td className="py-3 pr-3">{scopeLabel(row)}</td>
                  <td className="py-3 pr-3">
                    <Badge>{STATUS_LABELS[row.status]}</Badge>
                    <span className="text-muted mt-1 block text-sm">
                      {row.pseudonymized
                        ? "Po pseudonimizacji"
                        : "Bez pseudonimizacji"}
                    </span>
                    {row.error ? (
                      <span className="text-danger mt-1 block text-sm">
                        {row.error}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">
                    {formatDate(row.uploadedAt)}
                    {row.indexedAt ? (
                      <span className="text-muted block text-sm">
                        Zindeksowano: {formatDate(row.indexedAt)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3">
                    {confirming === row.documentId ? (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void confirmRemove(row)}>
                          {`Potwierdź usunięcie: ${row.title}`}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setConfirming(undefined)}
                        >
                          {`Anuluj usunięcie: ${row.title}`}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRemoved(undefined);
                          setConfirming(row.documentId);
                        }}
                      >
                        {`Usuń: ${row.title}`}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
