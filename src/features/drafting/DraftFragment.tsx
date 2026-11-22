import { useMutation } from "convex/react";
import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDemoRole } from "../../lib/demoRole";
import {
  MAX_DRAFT_TEXT,
  SENTIMENT_LABEL,
  copyToClipboard,
  STATUS_LABEL,
  errorText,
  labelOf,
} from "./labels";

type View = FunctionReturnType<typeof api.drafting.queries.listForReview>;
export type DraftRow = View["drafts"][number];
export type EvidenceRow = View["evidence"][number];

const FALLBACK = "Nie udało się zapisać zmiany. Spróbuj ponownie.";

export function DraftFragment({
  draft,
  evidence,
  general = false,
  flag,
}: {
  draft: DraftRow;
  evidence: EvidenceRow[];
  // The live inconsistency of the criterion (null: none); without it the stored one is shown.
  flag?: string | null;
  // A general tip is advice, not a claim about the employee, so it needs no observation.
  general?: boolean;
}) {
  const actor = { role: useDemoRole() };
  const setStatus = useMutation(api.drafting.mutations.setStatus);
  const edit = useMutation(api.drafting.mutations.edit);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const cited = evidence.filter((row) =>
    (draft.observationIds ?? []).includes(row.id),
  );
  const rejected = draft.status === "rejected";
  const shownFlag = flag === undefined ? draft.inconsistency : flag;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      return true;
    } catch (error) {
      setMessage({ text: errorText(error, FALLBACK), error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const ok = await run(() => edit({ actor, draftId: draft._id, text }));
    if (ok) setEditing(false);
  }

  async function copy() {
    setMessage(null);
    try {
      setMessage(await copyToClipboard(draft.text));
    } catch {
      setMessage({ text: "Nie udało się skopiować.", error: true });
    }
  }

  return (
    <li
      className={`border-divider space-y-2 rounded-md border p-3 ${rejected ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-surface-muted rounded px-2 py-0.5 text-sm font-semibold">
          {labelOf(STATUS_LABEL, draft.status)}
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <label className="block font-semibold" htmlFor={`edit-${draft._id}`}>
            Treść fragmentu
          </label>
          <Textarea
            id={`edit-${draft._id}`}
            value={text}
            maxLength={MAX_DRAFT_TEXT}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              disabled={busy || text.trim() === ""}
              onClick={() => void save()}
            >
              Zapisz
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setText(draft.text);
                setEditing(false);
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-line">{draft.text}</p>
      )}
      {shownFlag && (
        <StatusAlert tone="warning" live={false}>
          Uwaga: <span>{shownFlag}</span>
        </StatusAlert>
      )}
      {cited.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-muted text-sm font-semibold">
            Na podstawie obserwacji
          </h3>
          <ul className="text-ink space-y-1 text-sm">
            {cited.map((row) => (
              <li key={row.id} className="bg-surface-muted rounded p-2">
                <span className="font-medium">
                  {row.date}, {labelOf(SENTIMENT_LABEL, row.sentiment)}:
                </span>{" "}
                {row.text}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !general && (
          <StatusAlert tone="warning" live={false}>
            Brak podstawy w obserwacjach
          </StatusAlert>
        )
      )}
      {!editing && (
        <div className="flex flex-wrap gap-2">
          {draft.status !== "accepted" && draft.status !== "edited" && (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  setStatus({ actor, draftId: draft._id, status: "accepted" }),
                )
              }
            >
              {rejected ? "Przywróć" : "Akceptuj"}
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            Edytuj
          </Button>
          {!rejected && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  setStatus({ actor, draftId: draft._id, status: "rejected" }),
                )
              }
            >
              Odrzuć
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void copy()}
          >
            Kopiuj
          </Button>
        </div>
      )}
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-sm ${message.error ? "text-danger font-semibold" : "text-muted"}`}
        >
          {message.text}
        </p>
      )}
    </li>
  );
}
