import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { formatDate } from "../../lib/format";
import { criterionName, entryTitle, sentimentLabel, whoSees } from "./labels";

export type Entry = FunctionReturnType<
  typeof api.observations.queries.timeline
>[number];

export function Timeline({
  entries,
  total,
  canEdit,
  viewer,
  onEdit,
  onRemove,
}: {
  entries: Entry[];
  total: number;
  canEdit: boolean;
  viewer: "supervisor" | "hr";
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
    <ol className="divide-divider divide-y">
      {entries.map((entry) => {
        const title = entryTitle(entry.date, entry.text);
        const criterion = entry.criterionId
          ? criterionName(entry.criterionId)
          : undefined;
        return (
          <li
            key={entry._id}
            className="grid grid-cols-1 gap-x-4 gap-y-1 py-4 sm:grid-cols-[120px_1fr]"
          >
            <div className="flex flex-col items-start gap-1">
              <time dateTime={entry.date} className="text-ink font-bold">
                {formatDate(entry.date)}
              </time>
              <Badge>{sentimentLabel(entry.sentiment)}</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <p className="whitespace-pre-line">{entry.text}</p>
              {criterion ? (
                <p className="text-muted text-sm">{criterion}</p>
              ) : null}
              {entry.mine ? null : (
                <p className="text-muted text-sm">{whoSees(entry, viewer)}</p>
              )}
              {canEdit && entry.mine ? (
                <div className="flex flex-wrap gap-2">
                  {confirming === entry._id ? (
                    <>
                      <Button
                        aria-label={`Tak, usuń wpis z ${title}`}
                        onClick={() => void remove(entry)}
                      >
                        Tak, usuń
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Anuluj usuwanie wpisu z ${title}`}
                        onClick={() => setConfirming(undefined)}
                      >
                        Anuluj
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        aria-label={`Edytuj wpis z ${title}`}
                        onClick={() => onEdit(entry)}
                      >
                        Edytuj
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Usuń wpis z ${title}`}
                        onClick={() => setConfirming(entry._id)}
                      >
                        Usuń
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
              {error && confirming === entry._id ? (
                <StatusAlert tone="danger">{error}</StatusAlert>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
