import { useId, type ReactNode } from "react";

export type RatingOption = { value: string; label: string };

export function RatingScale({
  legend,
  hint,
  error,
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  hint?: ReactNode;
  error?: ReactNode;
  name?: string;
  options: readonly RatingOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const generated = useId();
  const group = name ?? generated;
  const hintId = `${generated}-hint`;
  const errorId = `${generated}-error`;
  const describedBy =
    [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
    undefined;
  return (
    <fieldset
      className="flex flex-col gap-2"
      disabled={disabled}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-ink mb-1 font-semibold">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="border-border has-checked:border-primary has-checked:bg-surface-muted flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2"
          >
            <input
              type="radio"
              name={group}
              value={option.value}
              checked={value === undefined ? undefined : value === option.value}
              onChange={() => onChange?.(option.value)}
              className="accent-primary size-5"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-danger text-sm font-semibold">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
