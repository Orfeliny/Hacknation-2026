import type { AnchorHTMLAttributes } from "react";
import { Icon } from "./Icon";

export function ExternalLink({
  children,
  className = "",
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel">) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary hover:text-primary-hover ${className}`}
      {...props}
    >
      {children}{" "}
      <Icon name="external" className="inline size-4 align-text-bottom" />{" "}
      <span className="sr-only">(otwiera się w nowej karcie)</span>
    </a>
  );
}
