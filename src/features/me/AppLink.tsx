import type { ReactNode } from "react";
import { Link, useInRouterContext } from "react-router";

export function AppLink({ to, children }: { to: string; children: ReactNode }) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <Link to={to}>{children}</Link>
  ) : (
    <a href={to}>{children}</a>
  );
}
