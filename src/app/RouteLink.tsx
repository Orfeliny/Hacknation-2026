import type { ReactNode } from "react";
import { Link } from "react-router";
import { useRouteRegistered } from "./routeRegistry";

export function RouteLink({
  to,
  children,
  className = "text-primary font-semibold",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  if (!useRouteRegistered(to)) return null;
  return (
    <Link to={to} className={`inline-flex min-h-11 items-center ${className}`}>
      {children}
    </Link>
  );
}
