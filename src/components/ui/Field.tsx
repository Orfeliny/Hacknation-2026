import { cloneElement, useId, type ReactElement, type ReactNode } from "react";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactElement<ControlProps>;
}) {
  const uid = useId();
  const id = children.props.id ?? `${uid}-control`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const describedBy =
    [
      children.props["aria-describedby"],
      hint ? hintId : "",
      error ? errorId : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-ink font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })}
      {error ? (
        <p id={errorId} className="text-danger text-sm font-semibold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
