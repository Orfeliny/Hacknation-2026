import { useId } from "react";

export type CompactOption = { value: string; label: string; short: string };

export function CompactRating({
  legend,
  description,
  options,
  value,
  disabled,
  onChange,
}: {
  legend: string;
  description?: string;
  options: readonly CompactOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const group = useId();
  const labelId = `${group}-label`;
  const selected = options.find((o) => o.value === value);
  return (
    <div className="border-border flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-white p-4">
      <div className="min-w-0 flex-1 basis-60 space-y-1">
        <p id={labelId} className="text-ink font-semibold">
          {legend}
        </p>
        {description ? (
          <details className="text-muted text-sm">
            <summary className="text-primary cursor-pointer">
              Opis kryterium
            </summary>
            <p className="mt-1">{description}</p>
          </details>
        ) : null}
      </div>
      {disabled ? (
        <p className="text-ink">{selected ? selected.label : "Brak oceny"}</p>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="flex flex-wrap gap-2"
        >
          {options.map((o) => (
            <label
              key={o.value}
              className="border-border has-checked:border-primary has-checked:bg-primary has-focus-visible:outline-primary flex size-11 cursor-pointer items-center justify-center rounded-md border bg-white font-semibold has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                type="radio"
                name={group}
                value={o.value}
                aria-label={o.label}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span aria-hidden="true">{o.short}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
