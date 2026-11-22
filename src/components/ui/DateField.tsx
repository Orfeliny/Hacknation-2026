import { useState, type ReactNode } from "react";
import { parsePolishDate } from "../../lib/parseDate";
import { Field } from "./Field";
import { Input } from "./Input";

function toPolish(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}.${month}.${year}` : "";
}

export function DateField({
  label,
  hint,
  value,
  onChange,
  name,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (iso: string) => void;
  name?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(toPolish(value));
  const [error, setError] = useState<string | null>(null);

  function commit(next: string) {
    setText(next);
    if (next.trim() === "") {
      setError(null);
      onChange("");
      return;
    }
    const iso = parsePolishDate(next);
    if (iso) {
      setError(null);
      onChange(iso);
    } else {
      onChange("");
    }
  }

  function validate() {
    if (text.trim() !== "" && !parsePolishDate(text)) {
      setError("Podaj istniejącą datę w formacie dd.mm.rrrr.");
    }
  }

  return (
    <Field label={label} hint={hint} error={error}>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="dd.mm.rrrr"
        autoComplete="off"
        name={name}
        required={required}
        value={text}
        onChange={(event) => commit(event.target.value)}
        onBlur={validate}
      />
    </Field>
  );
}
