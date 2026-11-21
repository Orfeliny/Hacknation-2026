import type { AnchorHTMLAttributes } from "react";

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
      {children} <span className="sr-only">(otwiera się w nowej karcie)</span>
    </a>
  );
}
