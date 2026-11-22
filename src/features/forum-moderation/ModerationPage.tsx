import { useState } from "react";
import { Link } from "react-router";
import type { ForumModerationRow } from "../../../convex/lib/contracts/forum";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import {
  useDismissReport,
  useHideThread,
  useReportedThreads,
  useRestoreThread,
} from "../../lib/backend/forum";
import { useDemoRole } from "../../lib/demoRole";
import { KIND_LABELS } from "../forum/labels";
import { errorMessage } from "./errors";

const dateOf = (ms: number) => new Date(ms).toLocaleDateString("pl-PL");

type Action = "hide" | "restore" | "dismiss";

function Row({
  row,
  busy,
  onAction,
}: {
  row: ForumModerationRow;
  busy: boolean;
  onAction: (action: Action, row: ForumModerationRow) => void;
}) {
  const hidden = row.hiddenAt !== undefined;
  const reported = row.reportedAt !== undefined;
  return (
    <li>
      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-ink text-lg font-bold">{row.title}</h2>
          <Badge>{KIND_LABELS[row.kind]}</Badge>
          {reported ? (
            <Badge>Zgłoszony {dateOf(row.reportedAt as number)}</Badge>
          ) : null}
          {hidden ? (
            <Badge>Ukryty {dateOf(row.hiddenAt as number)}</Badge>
          ) : null}
        </div>
        <p className="text-muted">
          {row.authorName}
          {row.authorUnit ? `, ${row.authorUnit}` : ""} ·{" "}
          {dateOf(row.createdAt)} · odpowiedzi: {row.replyCount}
        </p>
        <p className="whitespace-pre-wrap">{row.excerpt}</p>
        <div className="flex flex-wrap items-center gap-2">
          {hidden ? (
            <Button
              disabled={busy}
              onClick={() => onAction("restore", row)}
              aria-label={`Przywróć: ${row.title}`}
            >
              Przywróć
            </Button>
          ) : (
            <Button
              disabled={busy}
              onClick={() => onAction("hide", row)}
              aria-label={`Ukryj: ${row.title}`}
            >
              Ukryj
            </Button>
          )}
          {reported ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => onAction("dismiss", row)}
              aria-label={`Odrzuć zgłoszenie: ${row.title}`}
            >
              Odrzuć zgłoszenie
            </Button>
          ) : null}
          <Link
            to={`/forum?watek=${row.threadId}`}
            className="text-primary underline"
            aria-label={`Zobacz wątek: ${row.title}`}
          >
            Zobacz wątek
          </Link>
        </div>
      </Card>
    </li>
  );
}

export function ModerationPage() {
  const role = useDemoRole();
  const { data, isDemo } = useReportedThreads();
  const hide = useHideThread();
  const restore = useRestoreThread();
  const dismiss = useDismissReport();
  const [busyId, setBusyId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function onAction(action: Action, row: ForumModerationRow) {
    setError(undefined);
    setBusyId(row.threadId);
    try {
      const run = { hide, restore, dismiss }[action];
      await run({ threadId: row.threadId });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Moderacja forum</title>
      <PageHeader
        title="Moderacja forum"
        description="Zgłoszone i ukryte wątki, od najstarszego zgłoszenia. Ukryty wątek znika z forum dla wszystkich poza kadrami."
      />
      {isDemo ? <DemoDataNote /> : null}
      {role !== "hr" ? (
        <StatusAlert tone="warning">
          Moderacja forum jest dostępna dla kadr.
        </StatusAlert>
      ) : (
        <>
          {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
          {data === undefined ? (
            <p>Ładowanie wątków…</p>
          ) : data.length === 0 ? (
            <p>Brak zgłoszonych i ukrytych wątków.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.map((row) => (
                <Row
                  key={row.threadId}
                  row={row}
                  busy={busyId === row.threadId}
                  onAction={(action, target) => void onAction(action, target)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
