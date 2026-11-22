import { NavLink } from "react-router";
import { useChallengeProfile } from "../lib/challengeProfile";
import { useDemoRole } from "../lib/demoRole";
import { startPathFor, visibleNav, type NavItem } from "./navigation";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-md px-3 text-base font-semibold ${
    isActive ? "bg-surface-muted text-ink" : "text-primary"
  }`;

export function SideNav({ nav }: { nav: NavItem[] }) {
  const role = useDemoRole();
  const profile = useChallengeProfile();
  const items = visibleNav(nav, role, profile);
  const hasStart = startPathFor(nav, role) !== undefined;
  return (
    <nav aria-label="Główna nawigacja" className="w-56 shrink-0 print:hidden">
      <ul className="space-y-1">
        {!hasStart && (
          <li>
            <NavLink to="/" end className={linkClass}>
              Start
            </NavLink>
          </li>
        )}
        {items.map((item) => (
          <li key={item.path}>
            <NavLink to={item.path} className={linkClass}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
