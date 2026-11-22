import { useMutation, useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FORUM_LIMITS } from "../../../convex/lib/contracts/forum";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
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

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";

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
      <p
        role="alert"
        className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
      >
        {this.props.message}
      </p>
    ) : (
      this.props.children
    );
  }
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span
      className={`text-xs ${value.length > max ? "text-red-700" : "text-slate-600"}`}
    >
      {value.length}/{max}
    </span>
  );
}

function ReportedMark() {
  return (
    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">
      zgłoszony
    </span>
  );
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
        <h2 className="text-lg font-semibold">Nowy wątek</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="new-kind" className="block text-sm font-medium">
              Rodzaj wątku
            </label>
            <select
              id="new-kind"
              className={fieldClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as ThreadKind)}
            >
              {THREAD_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="new-criterion"
              className="block text-sm font-medium"
            >
              Kryterium (opcjonalnie)
            </label>
            <select
              id="new-criterion"
              className={fieldClass}
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
            >
              <option value="">bez kryterium</option>
              {CRITERIA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="new-title" className="block text-sm font-medium">
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
          <label htmlFor="new-body" className="block text-sm font-medium">
            Treść wątku
          </label>
          <textarea
            id="new-body"
            rows={4}
            className={fieldClass}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Counter value={body} max={FORUM_LIMITS.body} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
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
          <label htmlFor="filter-kind" className="block text-sm font-medium">
            Rodzaj wątku
          </label>
          <select
            id="filter-kind"
            className={fieldClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as ThreadKind | "")}
          >
            <option value="">wszystkie</option>
            {THREAD_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="filter-criterion"
            className="block text-sm font-medium"
          >
            Kryterium
          </label>
          <select
            id="filter-criterion"
            className={fieldClass}
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
          >
            <option value="">wszystkie</option>
            {CRITERIA.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </Card>
      {threads === undefined ? (
        <p>Ładowanie wątków…</p>
      ) : threads.length === 0 ? (
        <p>
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
                    className="font-medium text-indigo-700 underline"
                    to={`/forum?watek=${t.threadId}`}
                    aria-label={`Otwórz wątek: ${t.title} (${t.authorName}, ${dateOf(t.createdAt)})`}
                  >
                    {t.title}
                  </Link>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {KIND_LABELS[t.kind]}
                  </span>
                  {t.criterionId && (
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs">
                      {criterionName(t.criterionId)}
                    </span>
                  )}
                  {t.reported && <ReportedMark />}
                </div>
                <p className="text-sm">{t.excerpt}</p>
                <p className="text-xs text-slate-600">
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
      <label htmlFor="reply-body" className="block text-sm font-medium">
        Twoja odpowiedź
      </label>
      <textarea
        id="reply-body"
        rows={3}
        className={fieldClass}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Counter value={body} max={FORUM_LIMITS.reply} />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
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

  if (view === undefined) return <p>Ładowanie wątku…</p>;
  if (view === null) {
    return (
      <p
        role="alert"
        className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
      >
        Nie znaleziono wątku. Mógł zostać usunięty.
      </p>
    );
  }
  const { thread, replies } = view;
  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{thread.title}</h2>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
            {KIND_LABELS[thread.kind]}
          </span>
          {thread.criterionId && (
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs">
              {criterionName(thread.criterionId)}
            </span>
          )}
          {thread.reported && <ReportedMark />}
          {thread.hidden && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              ukryty przed pozostałymi rolami
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600">
          {thread.authorName}
          {thread.authorUnit ? `, ${thread.authorUnit}` : ""} ·{" "}
          {dateOf(thread.createdAt)}
        </p>
        <p className="text-sm whitespace-pre-wrap">{thread.body}</p>
        <div>
          <Button
            className="border border-slate-300 bg-white !text-slate-800 hover:!bg-slate-100"
            onClick={() => void reportThread()}
          >
            Zgłoś wątek
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </Card>
      <section aria-labelledby="replies-heading" className="space-y-2">
        <h3 id="replies-heading" className="font-semibold">
          Odpowiedzi ({replies.length})
        </h3>
        {replies.length === 0 ? (
          <p className="text-sm">Brak odpowiedzi. Napisz pierwszą.</p>
        ) : (
          <ul className="space-y-2">
            {replies.map((r) => (
              <li key={r.replyId}>
                <Card className="space-y-1">
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                  <p className="text-xs text-slate-600">
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
      <title>Forum rozwoju</title>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Forum rozwoju</h1>
        {threadId && (
          <Link className="text-sm text-indigo-700 underline" to="/forum">
            Wszystkie wątki
          </Link>
        )}
      </div>
      {!online ? (
        <p className="text-sm text-slate-600">
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
