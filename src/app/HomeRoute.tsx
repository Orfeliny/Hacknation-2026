import { Navigate } from "react-router";
import { useDemoRole } from "../lib/demoRole";
import { HomePage } from "../routes/HomePage";
import { startPathFor, type NavItem } from "./navigation";
import { ProfileStart } from "./ProfileStart";

export function HomeRoute({ nav, paths }: { nav: NavItem[]; paths: string[] }) {
  const start = startPathFor(nav, useDemoRole());
  if (start) return <Navigate to={start} replace />;
  return (
    <div className="space-y-4">
      <HomePage />
      <ProfileStart paths={paths} />
    </div>
  );
}
