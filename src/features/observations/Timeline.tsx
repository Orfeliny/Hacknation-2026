import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { formatDate } from "../../lib/format";
import { criterionName, entryTitle, sentimentLabel, whoSees } from "./labels";

export type Entry = FunctionReturnType<
  typeof api.observations.queries.timeline
>[number];

export function Timeline({
  entries,
  total,
  canEdit,
  onEdit,
  onRemove,
}: {
  entries: Entry[];
  total: number;
  canEdit: boolean;
  onEdit: (entry: Entry) => void;
  onRemove: (entry: Entry) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<string>();
  const [error, setError] = useState<string>();

  if (entries.length === 0) {
    return (
      <p>
        {total === 0
          ? "Nie ma jeszcze wpisów o tym pracowniku."
          : "Żaden wpis nie pasuje do filtrów."}
      </p>
    );
  }

  async function remove(entry: Entry) {
    setError(undefined);
    try {
      await onRemove(entry);
      setConfirming(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się usunąć wpisu.");
    }
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => {
        const title = entryTitle(entry.date, entry.text);
        return (
          <li key={entry._id}>
            <Card className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <time dateTime={entry.date} className="text-ink font-bold">
                  {formatDate(entry.date)}
                </time>
                <Badge>{sentimentLabel(entry.sentiment)}</Badge>
                <Badge>{criterionName(entry.criterionId)}</Badge>
              </div>
              <p className="whitespace-pre-line">{entry.text}</p>
              <p className="text-muted text-sm">{whoSees(entry)}</p>
              {canEdit && entry.mine ? (
                <div className="flex flex-wrap gap-2">
                  {confirming === entry._id ? (
                    <>
                      <Button onClick={() => void remove(entry)}>
                        {`Tak, usuń wpis z ${title}`}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setConfirming(undefined)}
                      >
                        {`Anuluj usuwanie wpisu z ${title}`}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => onEdit(entry)}>
                        {`Edytuj wpis z ${title}`}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirming(entry._id)}
                      >
                        {`Usuń wpis z ${title}`}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
              {error && confirming === entry._id ? (
                <p role="alert" className="text-danger font-semibold">
                  {error}
                </p>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
