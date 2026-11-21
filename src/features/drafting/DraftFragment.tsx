import { useMutation } from "convex/react";
import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { useDemoRole } from "../../lib/demoRole";
import {
  MAX_DRAFT_TEXT,
  SENTIMENT_LABEL,
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
}: {
  draft: DraftRow;
  evidence: EvidenceRow[];
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
      await navigator.clipboard.writeText(draft.text);
      setMessage({ text: "Skopiowano do schowka.", error: false });
    } catch {
      setMessage({
        error: true,
        text: "Nie udało się skopiować. Zaznacz tekst i skopiuj go ręcznie.",
      });
    }
  }

  return (
    <li
      className={`space-y-2 rounded-md border border-slate-200 p-3 ${rejected ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">
          {labelOf(STATUS_LABEL, draft.status)}
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <label
            className="block text-sm font-medium"
            htmlFor={`edit-${draft._id}`}
          >
            Treść fragmentu
          </label>
          <textarea
            id={`edit-${draft._id}`}
            value={text}
            maxLength={MAX_DRAFT_TEXT}
            rows={4}
            onChange={(event) => setText(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button
              disabled={busy || text.trim() === ""}
              onClick={() => void save()}
            >
              Zapisz
            </Button>
            <Button
              className="bg-slate-600 hover:bg-slate-700"
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
      {draft.inconsistency && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm">
          <span className="font-semibold">Uwaga: </span>
          {draft.inconsistency}
        </p>
      )}
      {cited.length > 0 ? (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-slate-600 uppercase">
            Na podstawie obserwacji
          </h4>
          <ul className="space-y-1 text-sm text-slate-700">
            {cited.map((row) => (
              <li key={row.id} className="rounded bg-slate-50 p-2">
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
          <p className="text-sm font-medium text-amber-800">
            Brak podstawy w obserwacjach
          </p>
        )
      )}
      {!editing && (
        <div className="flex flex-wrap gap-2">
          {draft.status !== "accepted" && (
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
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
            className="bg-slate-600 hover:bg-slate-700"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            Edytuj
          </Button>
          {!rejected && (
            <Button
              className="bg-slate-600 hover:bg-slate-700"
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
            className="bg-slate-600 hover:bg-slate-700"
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
          className={`text-sm ${message.error ? "text-red-700" : "text-slate-700"}`}
        >
          {message.text}
        </p>
      )}
    </li>
  );
}
