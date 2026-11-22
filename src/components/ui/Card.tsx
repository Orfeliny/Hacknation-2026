import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-border rounded-xl border bg-white p-6 ${className}`}
      {...props}
    />
  );
}
