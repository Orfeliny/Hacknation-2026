import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SELF_NOTE_MAX_LENGTH } from "../../../convex/me/limits";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { errorMessage } from "../review/types";

const actor = { role: "employee" as const };

export function SelfNotes({ reviewId }: { reviewId?: Id<"reviews"> }) {
  const notes = useQuery(api.me.queries.selfNotes, { actor });
  const add = useMutation(api.me.mutations.addSelfNote);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      await add({ actor, text, ...(reviewId ? { reviewId } : {}) });
      setText("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="space-y-2">
      <h2 className="text-lg font-semibold">Moje notatki</h2>
      <p className="text-sm text-slate-600">
        Notatki widzisz tylko Ty i kadry. Przełożony ich nie widzi.
      </p>
      <form onSubmit={(e) => void submit(e)} className="space-y-2">
        <label htmlFor="self-note" className="block text-sm font-medium">
          Nowa notatka
        </label>
        <textarea
          id="self-note"
          rows={3}
          maxLength={SELF_NOTE_MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
        />
        <Button type="submit" disabled={!text.trim()}>
          Dodaj notatkę
        </Button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
      {notes === undefined ? (
        <p>Ładowanie notatek…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm">Brak notatek.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {notes.map((note) => (
            <li key={note._id}>
              <time className="text-slate-500">
                {new Date(note.createdAt).toLocaleDateString("pl-PL")}
              </time>{" "}
              {note.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
