import type { SelectHTMLAttributes } from "react";
import { controlClass } from "./Input";

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}
