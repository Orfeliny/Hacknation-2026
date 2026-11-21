import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-border rounded-lg border bg-white p-4 ${className}`}
      {...props}
    />
  );
}
