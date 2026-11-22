import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SELF_NOTE_MAX_LENGTH } from "../../../convex/me/limits";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate } from "../../lib/format";
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
    <Card className="space-y-3 rounded-xl px-6 py-5">
      <h2 className="text-[22px] font-bold">Moje notatki</h2>
      <StatusAlert tone="info" live={false}>
        Notatki widzisz Ty i kadry. Przełożony tego nie widzi i nie można mu
        tego udostępnić.
      </StatusAlert>
      <p className="text-muted">
        Zapisuj swoje osiągnięcia. Przydadzą się na rozmowie oceniającej.
      </p>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Field label="Nowa notatka">
          <Textarea
            maxLength={SELF_NOTE_MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="np. Przygotowałem prognozę roczną tydzień przed terminem"
          />
        </Field>
        <Button type="submit" disabled={!text.trim()}>
          Zapisz notatkę
        </Button>
        {error && <StatusAlert tone="danger">{error}</StatusAlert>}
      </form>
      {notes === undefined ? (
        <p>Ładowanie notatek…</p>
      ) : notes.length === 0 ? (
        <p>Brak notatek.</p>
      ) : (
        <ul className="divide-y divide-[#c0c0c0]">
          {notes.map((note) => (
            <li key={note._id} className="py-2 first:pt-0">
              <time className="text-muted block text-sm">
                {formatDate(note.createdAt)}
              </time>
              {note.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
