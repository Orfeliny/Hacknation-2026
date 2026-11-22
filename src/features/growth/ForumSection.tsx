import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import {
  useCreateThread,
  useForumThread,
  useForumThreads,
  useReplyToThread,
  useReportThread,
} from "../../lib/backend/forum";
import { formatDate } from "../../lib/format";
import { rozwojHref } from "./context";
import {
  FAILED_MESSAGE,
  firstIssue,
  replyFormSchema,
  threadFormSchema,
} from "./forumSchema";
import {
  CRITERIA,
  NEW_THREAD_KIND_LABELS,
  THREAD_KINDS,
  THREAD_KIND_LABELS,
  criterionName,
  type CriterionId,
  type ThreadKind,
} from "./labels";

export const NEW_THREAD_KIND_ID = "nowy-watek-rodzaj";

function ReportButton({
  threadId,
  title,
  reported,
}: {
  threadId: Id<"forumThreads">;
  title: string;
  reported: boolean;
}) {
  const report = useReportThread();
  const [failed, setFailed] = useState(false);

  if (reported) return <Badge>Zgłoszony do moderacji</Badge>;
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setFailed(false);
          report({ threadId }).catch(() => setFailed(true));
        }}
      >
        Zgłoś<span className="sr-only"> wątek do moderacji: {title}</span>
      </Button>
      {failed && (
        <p role="alert" className="text-danger text-sm font-semibold">
          Nie udało się zgłosić wątku. Spróbuj ponownie.
        </p>
      )}
    </>
  );
}

function ThreadList() {
  const [params] = useSearchParams();
  const { data: threads } = useForumThreads();

  if (threads === undefined) return <p>Ładowanie wątków…</p>;
  if (threads.length === 0)
    return <p>Nie ma jeszcze żadnych wątków. Dodaj pierwszy.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {threads.map((thread) => (
        <li
          key={thread.threadId}
          className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3"
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{THREAD_KIND_LABELS[thread.kind]}</Badge>
              {thread.criterionId && (
                <Badge>{criterionName(thread.criterionId)}</Badge>
              )}
            </div>
            <Link
              className="font-semibold"
              to={rozwojHref(params, { watek: thread.threadId })}
            >
              {thread.title}
            </Link>
            <span className="text-muted">
              {thread.authorName}, {thread.authorUnit} · odpowiedzi:{" "}
              {thread.replyCount} · {formatDate(thread.createdAt)}
            </span>
          </div>
          <ReportButton
            threadId={thread.threadId}
            title={thread.title}
            reported={thread.reported}
          />
        </li>
      ))}
    </ul>
  );
}

function ReplyForm({ threadId }: { threadId: Id<"forumThreads"> }) {
  const reply = useReplyToThread();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    const parsed = replyFormSchema.safeParse({ body });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    try {
      await reply({ threadId, body: parsed.data.body });
      setBody("");
    } catch {
      setError(FAILED_MESSAGE);
    }
  }

  return (
    <form
      className="flex flex-col items-start gap-3"
      onSubmit={(e) => void submit(e)}
    >
      <div className="w-full">
        <Field label="Twoja odpowiedź" error={error}>
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit">Dodaj odpowiedź</Button>
    </form>
  );
}

function ThreadDetail({ threadId }: { threadId: Id<"forumThreads"> }) {
  const [params] = useSearchParams();
  const { data: view } = useForumThread({ threadId });

  const back = (
    <Link className="inline-flex min-h-11 items-center" to={rozwojHref(params)}>
      Wszystkie wątki
    </Link>
  );
  if (view === undefined) return <p>Ładowanie wątku…</p>;
  if (view === null) {
    return (
      <div className="flex flex-col gap-3">
        <StatusAlert tone="danger">
          Nie znaleziono wątku. Mógł zostać usunięty.
        </StatusAlert>
        {back}
      </div>
    );
  }
  const { thread, replies } = view;
  return (
    <div className="flex flex-col gap-4">
      {back}
      <Card className="flex flex-col items-start gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{THREAD_KIND_LABELS[thread.kind]}</Badge>
          {thread.criterionId && (
            <Badge>{criterionName(thread.criterionId)}</Badge>
          )}
        </div>
        <h3 className="text-lg font-bold">{thread.title}</h3>
        <p className="text-muted">
          {thread.authorName}, {thread.authorUnit} ·{" "}
          {formatDate(thread.createdAt)}
        </p>
        <p className="whitespace-pre-wrap">{thread.body}</p>
        <ReportButton
          threadId={thread.threadId}
          title={thread.title}
          reported={thread.reported}
        />
      </Card>
      <section aria-labelledby="h-odpowiedzi" className="flex flex-col gap-3">
        <h3 id="h-odpowiedzi" className="text-lg font-bold">
          Odpowiedzi ({replies.length})
        </h3>
        {replies.length === 0 ? (
          <p>Brak odpowiedzi. Napisz pierwszą.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {replies.map((reply) => (
              <li key={reply.replyId}>
                <Card className="flex flex-col gap-1">
                  <p className="whitespace-pre-wrap">{reply.body}</p>
                  <p className="text-muted">
                    {reply.authorName} · {formatDate(reply.createdAt)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReplyForm threadId={thread.threadId} />
    </div>
  );
}

function NewThreadForm({
  kind,
  onKindChange,
}: {
  kind: ThreadKind;
  onKindChange: (kind: ThreadKind) => void;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useCreateThread();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [criterion, setCriterion] = useState<CriterionId | "">("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    const parsed = threadFormSchema.safeParse({ kind, title, body });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setBusy(true);
    try {
      const threadId = await create({
        kind,
        title: parsed.data.title,
        body: parsed.data.body,
        ...(criterion ? { criterionId: criterion } : {}),
      });
      setTitle("");
      setBody("");
      setCriterion("");
      void navigate(rozwojHref(params, { watek: threadId }));
    } catch {
      setError(FAILED_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      id="nowy-watek"
      aria-labelledby="h-nowy"
      className="border-border flex flex-col items-start gap-4 rounded-xl border bg-white p-5"
      onSubmit={(e) => void submit(e)}
    >
      <h2 id="h-nowy" className="text-xl font-bold">
        Nowy wątek
      </h2>
      <div className="grid w-full gap-4">
        <Field label="Rodzaj">
          <Select
            id={NEW_THREAD_KIND_ID}
            value={kind}
            onChange={(e) => onKindChange(e.target.value as ThreadKind)}
          >
            {THREAD_KINDS.map((value) => (
              <option key={value} value={value}>
                {NEW_THREAD_KIND_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kryterium (opcjonalnie)">
          <Select
            value={criterion}
            onChange={(e) => setCriterion(e.target.value as CriterionId | "")}
          >
            <option value="">bez kryterium</option>
            {CRITERIA.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tytuł">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field
          label="Treść"
          hint="Widzi cały urząd. Bez ocen, obserwacji i spraw osobistych."
          error={error}
        >
          <Textarea
            value={body}
            placeholder="np. Mogę poprowadzić 2-godzinny warsztat z Excela dla 10 osób w styczniu."
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" disabled={busy}>
        Opublikuj
      </Button>
    </form>
  );
}

export function ForumSection({
  kind,
  onKindChange,
}: {
  kind: ThreadKind;
  onKindChange: (kind: ThreadKind) => void;
}) {
  const [params] = useSearchParams();
  const threadId = params.get("watek");
  const { isDemo } = useForumThreads();
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
      <section aria-labelledby="h-watki" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="h-watki" className="text-xl font-bold">
            Rozmowy na forum
          </h2>
          <span className="text-muted">Moderuje: komórka szkoleń</span>
        </div>
        {isDemo && <DemoDataNote />}
        {threadId ? (
          <ThreadDetail
            key={threadId}
            threadId={threadId as Id<"forumThreads">}
          />
        ) : (
          <ThreadList />
        )}
      </section>
      <NewThreadForm kind={kind} onKindChange={onKindChange} />
    </div>
  );
}
