import type { InputHTMLAttributes } from "react";

export const controlClass =
  "min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-base text-ink disabled:bg-surface-muted aria-[invalid=true]:border-danger";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}
