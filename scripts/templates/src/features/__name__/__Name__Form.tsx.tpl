import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { entryFormSchema, type EntryForm } from "./schema";

export function __Name__Form({
  onSubmit,
  offline,
}: {
  onSubmit: (values: EntryForm) => Promise<void>;
  offline: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = entryFormSchema.safeParse({ text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    if (offline) return;
    setPending(true);
    try {
      await onSubmit(parsed.data);
      setText("");
    } catch {
      setError("Nie udało się zapisać wpisu. Spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="space-y-2"
    >
      <label htmlFor="__name__-text" className="block text-sm font-medium">
        Nowy wpis
      </label>
      <Input
        id="__name__-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? "__name__-error" : undefined}
      />
      {error && (
        <p id="__name__-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {offline && (
        <p className="text-sm text-slate-600">
          Tryb offline: zapis jest wyłączony, bo backend nie jest połączony.
        </p>
      )}
      <Button type="submit" disabled={offline || pending}>
        Dodaj wpis
      </Button>
    </form>
  );
}
