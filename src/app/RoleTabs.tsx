import { Link } from "react-router";
import { DEMO_ROLES, setDemoRole, useDemoRole } from "../lib/demoRole";
import { useSession } from "../lib/session";
import { startPathFor, type NavItem } from "./navigation";

export function RoleTabs({ nav }: { nav: NavItem[] }) {
  const current = useDemoRole();
  const session = useSession();
  const roles = session
    ? DEMO_ROLES.filter((role) => session.roles.includes(role.value))
    : DEMO_ROLES;
  return (
    <nav aria-label={session ? "Rola" : "Rola (widok demonstracyjny)"}>
      <ul className="flex gap-1 rounded-full bg-[#EBEBEB] p-1">
        {roles.map((role) => {
          const active = role.value === current;
          return (
            <li key={role.value}>
              <Link
                to={startPathFor(nav, role.value) ?? "/"}
                onClick={() => setDemoRole(role.value)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-base font-semibold no-underline ${
                  active
                    ? "text-ink bg-white shadow-sm"
                    : "text-ink hover:bg-white/60"
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
