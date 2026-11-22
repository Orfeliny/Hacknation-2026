import type { ReactNode } from "react";
import { Link } from "react-router";
import { useRouteRegistered } from "./useRouteRegistered";

export function RouteLink({
  to,
  children,
  className = "text-primary font-semibold",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const registered = useRouteRegistered(to);
  if (!registered) return null;
  return (
    <Link to={to} className={`inline-flex min-h-11 items-center ${className}`}>
      {children}
    </Link>
  );
}
