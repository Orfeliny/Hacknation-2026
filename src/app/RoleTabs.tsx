import { Link } from "react-router";
import { DEMO_ROLES, setDemoRole, useDemoRole } from "../lib/demoRole";
import { startPathFor, type NavItem } from "./navigation";

export function RoleTabs({ nav }: { nav: NavItem[] }) {
  const current = useDemoRole();
  return (
    <nav aria-label="Rola (widok demonstracyjny)">
      <ul className="flex gap-1">
        {DEMO_ROLES.map((role) => {
          const active = role.value === current;
          return (
            <li key={role.value}>
              <Link
                to={startPathFor(nav, role.value) ?? "/"}
                onClick={() => setDemoRole(role.value)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-base font-semibold ${
                  active
                    ? "bg-primary text-white"
                    : "text-ink hover:bg-surface-muted"
                }`}
              >
                {role.tabLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
