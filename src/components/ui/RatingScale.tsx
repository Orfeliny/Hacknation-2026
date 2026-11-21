import { useId } from "react";

export type RatingOption = { value: string; label: string };

export function RatingScale({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  name?: string;
  options: readonly RatingOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const generated = useId();
  const group = name ?? generated;
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-ink mb-1 font-semibold">{legend}</legend>
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
    </fieldset>
  );
}
