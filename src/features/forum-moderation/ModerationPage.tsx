import { useRef, useState } from "react";
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
  error,
  onAction,
}: {
  row: ForumModerationRow;
  busy: boolean;
  error: string | undefined;
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
        {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
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

const DONE: Record<Action, string> = {
  hide: "Ukryto wątek",
  restore: "Przywrócono wątek",
  dismiss: "Odrzucono zgłoszenie wątku",
};

function Queue() {
  const { data, isDemo } = useReportedThreads();
  const hide = useHideThread();
  const restore = useRestoreThread();
  const dismiss = useDismissReport();
  const [busyId, setBusyId] = useState<string | undefined>();
  const [failed, setFailed] = useState<{ id: string; message: string }>();
  const [notice, setNotice] = useState("");
  const noticeRef = useRef<HTMLDivElement>(null);

  async function onAction(action: Action, row: ForumModerationRow) {
    setFailed(undefined);
    setNotice("");
    setBusyId(row.threadId);
    try {
      await { hide, restore, dismiss }[action]({ threadId: row.threadId });
      setNotice(`${DONE[action]}: ${row.title}`);
    } catch (failure) {
      setFailed({ id: row.threadId, message: errorMessage(failure) });
    } finally {
      setBusyId(undefined);
      // The focused button disappears when the row changes or goes away; keep the focus on the result.
      noticeRef.current?.focus();
    }
  }

  return (
    <>
      {isDemo ? <DemoDataNote /> : null}
      <div ref={noticeRef} tabIndex={-1} role="status" className="outline-none">
        {notice}
      </div>
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
              busy={busyId !== undefined}
              error={failed?.id === row.threadId ? failed.message : undefined}
              onAction={(action, target) => void onAction(action, target)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function ModerationPage() {
  const role = useDemoRole();
  return (
    <div className="flex flex-col gap-6">
      <title>Moderacja forum</title>
      <PageHeader
        title="Moderacja forum"
        description="Zgłoszone i ukryte wątki, od najstarszego zgłoszenia. Ukryty wątek znika z forum dla wszystkich poza kadrami."
      />
      {role === "hr" ? (
        <Queue />
      ) : (
        <StatusAlert tone="warning">
          Moderacja forum jest dostępna dla kadr.
        </StatusAlert>
      )}
    </div>
  );
}
