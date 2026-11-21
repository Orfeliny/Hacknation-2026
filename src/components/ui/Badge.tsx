import type { ReactNode } from "react";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`border-border text-ink inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-sm font-semibold ${className}`}
    >
      {children}
    </span>
  );
}
