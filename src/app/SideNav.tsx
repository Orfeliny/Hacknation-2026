import { Link, useLocation } from "react-router";
import { useChallengeProfile } from "../lib/challengeProfile";
import { useDemoRole } from "../lib/demoRole";
import { startPathFor, visibleNav, type NavItem } from "./navigation";

function isWithin(pathname: string, path: string): boolean {
  return path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(`${path}/`);
}

function activePath(pathname: string, paths: string[]): string | undefined {
  return paths
    .filter((path) => isWithin(pathname, path))
    .sort((a, b) => b.length - a.length)[0];
}

function NavEntry({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className={`text-ink flex min-h-11 items-center rounded-md px-3 text-base no-underline ${
          active ? "bg-surface-muted text-primary font-bold" : "font-semibold"
        }`}
      >
        {label}
      </Link>
    </li>
  );
}

export function SideNav({ nav }: { nav: NavItem[] }) {
  const role = useDemoRole();
  const profile = useChallengeProfile();
  const { pathname } = useLocation();
  const items = visibleNav(nav, role, profile);
  const hasStart = startPathFor(nav, role) !== undefined;
  const work = items.filter((item) => item.navGroup !== "help");
  const help = items.filter((item) => item.navGroup === "help");
  const active = activePath(pathname, [
    ...(hasStart ? [] : ["/"]),
    ...items.map((item) => item.path),
  ]);
  return (
    <nav
      aria-label="Główna nawigacja"
      className="border-divider flex w-64 shrink-0 flex-col border-r px-3 py-4 print:hidden"
    >
      <ul className="space-y-1">
        {!hasStart && <NavEntry to="/" label="Start" active={active === "/"} />}
        {work.map((item) => (
          <NavEntry
            key={item.path}
            to={item.path}
            label={item.label}
            active={active === item.path}
          />
        ))}
      </ul>
      {help.length > 0 && (
        <>
          {(work.length > 0 || !hasStart) && (
            <hr className="border-divider my-3" />
          )}
          <ul className="space-y-1">
            {help.map((item) => (
              <NavEntry
                key={item.path}
                to={item.path}
                label={item.label}
                active={active === item.path}
              />
            ))}
          </ul>
        </>
      )}
      <p className="text-muted mt-auto pt-6 text-sm">
        Przepisy: rozporządzenie PRM z 4.04.2016
        <br />
        Wersja reguł: 2016-04-23
      </p>
    </nav>
  );
}
