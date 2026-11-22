import { useMutation, useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FORUM_LIMITS } from "../../../convex/lib/contracts/forum";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { errorMessage } from "./errors";
import {
  CRITERIA,
  KIND_LABELS,
  THREAD_KINDS,
  criterionName,
  type CriterionId,
  type ThreadKind,
} from "./labels";
import { firstIssue, replyFormSchema, threadFormSchema } from "./schema";

const dateOf = (ms: number) => new Date(ms).toLocaleDateString("pl-PL");

// A failed query (a malformed id, a dropped connection) throws while rendering; keep the page alive.
class Boundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <StatusAlert tone="warning">{this.props.message}</StatusAlert>
    ) : (
      this.props.children
    );
  }
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span
      className={`text-sm ${value.length > max ? "text-danger font-semibold" : "text-muted"}`}
    >
      {value.length}/{max}
    </span>
  );
}

function ReportedMark() {
  return <Badge>zgłoszony</Badge>;
}

function NewThreadForm({ onCreated }: { onCreated: (id: string) => void }) {
  const actor = { role: useDemoRole() };
  const create = useMutation(api.forum.mutations.createThread);
  const [kind, setKind] = useState<ThreadKind>("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [criterion, setCriterion] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    const parsed = threadFormSchema.safeParse({
      kind,
      title,
      body,
      criterionId: criterion || undefined,
    });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setBusy(true);
    try {
      const id = await create({
        actor,
        kind,
        title: parsed.data.title,
        body: parsed.data.body,
        ...(criterion ? { criterionId: criterion as CriterionId } : {}),
      });
      setTitle("");
      setBody("");
      setCriterion("");
      onCreated(id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <h2 className="text-ink text-[22px] font-bold">Nowy wątek</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="new-kind" className="text-ink block font-semibold">
              Rodzaj wątku
            </label>
            <Select
              id="new-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ThreadKind)}
            >
              {THREAD_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="new-criterion"
              className="text-ink block font-semibold"
            >
              Kryterium (opcjonalnie)
            </label>
            <Select
              id="new-criterion"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
            >
              <option value="">bez kryterium</option>
              {CRITERIA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="new-title" className="text-ink block font-semibold">
            Tytuł
          </label>
          <Input
            id="new-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Counter value={title} max={FORUM_LIMITS.title} />
        </div>
        <div className="space-y-1">
          <label htmlFor="new-body" className="text-ink block font-semibold">
            Treść wątku
          </label>
          <Textarea
            id="new-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Counter value={body} max={FORUM_LIMITS.body} />
        </div>
        {error && <StatusAlert tone="danger">{error}</StatusAlert>}
        <Button type="submit" disabled={busy}>
          Dodaj wątek
        </Button>
      </form>
    </Card>
  );
}

function ThreadList({
  kind,
  setKind,
  criterion,
  setCriterion,
}: {
  kind: ThreadKind | "";
  setKind: (value: ThreadKind | "") => void;
  criterion: string;
  setCriterion: (value: string) => void;
}) {
  const actor = { role: useDemoRole() };
  const [, setParams] = useSearchParams();
  const threads = useQuery(api.forum.queries.listThreads, {
    actor,
    ...(kind ? { kind } : {}),
    ...(criterion ? { criterionId: criterion as CriterionId } : {}),
  });
  const filtered = kind !== "" || criterion !== "";

  return (
    <div className="space-y-4">
      <NewThreadForm onCreated={(id) => setParams({ watek: id })} />
      <Card className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="filter-kind" className="text-ink block font-semibold">
            Rodzaj wątku
          </label>
          <Select
            id="filter-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ThreadKind | "")}
          >
            <option value="">wszystkie</option>
            {THREAD_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="filter-criterion"
            className="text-ink block font-semibold"
          >
            Kryterium
          </label>
          <Select
            id="filter-criterion"
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
          >
            <option value="">wszystkie</option>
            {CRITERIA.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      <h2 className="text-ink text-[22px] font-bold">Wątki</h2>
      {threads === undefined ? (
        <p className="text-muted">Ładowanie wątków…</p>
      ) : threads.length === 0 ? (
        <p className="text-muted">
          {filtered
            ? "Brak wątków dla wybranych filtrów."
            : "Nie ma jeszcze żadnych wątków. Dodaj pierwszy."}
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.threadId}>
              <Card className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="text-primary font-semibold hover:underline"
                    to={`/forum?watek=${t.threadId}`}
                    aria-label={`Otwórz wątek: ${t.title} (${t.authorName}, ${dateOf(t.createdAt)})`}
                  >
                    {t.title}
                  </Link>
                  <Badge>{KIND_LABELS[t.kind]}</Badge>
                  {t.criterionId && (
                    <Badge>{criterionName(t.criterionId)}</Badge>
                  )}
                  {t.reported && <ReportedMark />}
                </div>
                <p>{t.excerpt}</p>
                <p className="text-muted text-sm">
                  {t.authorName}
                  {t.authorUnit ? `, ${t.authorUnit}` : ""} ·{" "}
                  {dateOf(t.createdAt)} · odpowiedzi: {t.replyCount}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReplyForm({ threadId }: { threadId: Id<"forumThreads"> }) {
  const actor = { role: useDemoRole() };
  const reply = useMutation(api.forum.mutations.reply);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    const parsed = replyFormSchema.safeParse({ body });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setBusy(true);
    try {
      await reply({ actor, threadId, body: parsed.data.body });
      setBody("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={(e) => void submit(e)}>
      <label htmlFor="reply-body" className="text-ink block font-semibold">
        Twoja odpowiedź
      </label>
      <Textarea
        id="reply-body"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Counter value={body} max={FORUM_LIMITS.reply} />
      {error && <StatusAlert tone="danger">{error}</StatusAlert>}
      <div>
        <Button type="submit" disabled={busy}>
          Dodaj odpowiedź
        </Button>
      </div>
    </form>
  );
}

function ThreadView({ threadId }: { threadId: Id<"forumThreads"> }) {
  const actor = { role: useDemoRole() };
  const view = useQuery(api.forum.queries.getThread, { actor, threadId });
  const report = useMutation(api.forum.mutations.report);
  const [error, setError] = useState<string | undefined>();

  async function reportThread() {
    setError(undefined);
    try {
      await report({ actor, threadId });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (view === undefined) return <p className="text-muted">Ładowanie wątku…</p>;
  if (view === null) {
    return (
      <StatusAlert tone="info">
        Nie znaleziono wątku. Mógł zostać usunięty.
      </StatusAlert>
    );
  }
  const { thread, replies } = view;
  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-ink text-[22px] font-bold">{thread.title}</h2>
          <Badge>{KIND_LABELS[thread.kind]}</Badge>
          {thread.criterionId && (
            <Badge>{criterionName(thread.criterionId)}</Badge>
          )}
          {thread.reported && <ReportedMark />}
          {thread.hidden && <Badge>ukryty przed pozostałymi rolami</Badge>}
        </div>
        <p className="text-muted text-sm">
          {thread.authorName}
          {thread.authorUnit ? `, ${thread.authorUnit}` : ""} ·{" "}
          {dateOf(thread.createdAt)}
        </p>
        <p className="whitespace-pre-wrap">{thread.body}</p>
        <div>
          <Button variant="secondary" onClick={() => void reportThread()}>
            Zgłoś wątek
          </Button>
        </div>
        {error && <StatusAlert tone="danger">{error}</StatusAlert>}
      </Card>
      <section aria-labelledby="replies-heading" className="space-y-2">
        <h3 id="replies-heading" className="text-ink text-lg font-bold">
          Odpowiedzi ({replies.length})
        </h3>
        {replies.length === 0 ? (
          <p className="text-muted">Brak odpowiedzi. Napisz pierwszą.</p>
        ) : (
          <ul className="space-y-2">
            {replies.map((r) => (
              <li key={r.replyId}>
                <Card className="space-y-1">
                  <p className="whitespace-pre-wrap">{r.body}</p>
                  <p className="text-muted text-sm">
                    {r.authorName} · {dateOf(r.createdAt)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReplyForm threadId={threadId} />
    </div>
  );
}

export function ForumPage() {
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const threadId = params.get("watek");
  const [kind, setKind] = useState<ThreadKind | "">("");
  const [criterion, setCriterion] = useState("");
  return (
    <section className="space-y-4">
      <PageTitle>Wątki forum</PageTitle>
      <PageHeader
        title="Wątki forum"
        actions={
          threadId ? (
            <Link className="text-primary underline" to="/forum">
              Wszystkie wątki
            </Link>
          ) : undefined
        }
      />
      {!online ? (
        <p className="text-muted">
          Tryb offline: forum wymaga połączenia z backendem.
        </p>
      ) : threadId ? (
        <Boundary
          key={threadId}
          message="Nie znaleziono wątku albo nie udało się go wczytać."
        >
          <ThreadView threadId={threadId as Id<"forumThreads">} />
        </Boundary>
      ) : (
        <Boundary message="Nie udało się wczytać wątków. Spróbuj odświeżyć stronę.">
          <ThreadList
            kind={kind}
            setKind={setKind}
            criterion={criterion}
            setCriterion={setCriterion}
          />
        </Boundary>
      )}
    </section>
  );
}
