import type { TextareaHTMLAttributes } from "react";
import { controlClass } from "./Input";

export function Textarea({
  className = "",
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={`${controlClass} ${className}`}
      {...props}
    />
  );
}
