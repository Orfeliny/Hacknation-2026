import { NavLink, Outlet } from "react-router";
import {
  DEMO_ROLES,
  setDemoRole,
  useDemoRole,
  type DemoRole,
} from "../lib/demoRole";
import { OfflineBanner } from "./OfflineBanner";

function DemoRoleSelect() {
  const role = useDemoRole();
  return (
    <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
      Rola (demo)
      <select
        value={role}
        onChange={(event) => setDemoRole(event.target.value as DemoRole)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        {DEMO_ROLES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type NavItem = { path: string; label: string };

export function Layout({ nav, offline }: { nav: NavItem[]; offline: boolean }) {
  return (
    <>
      {offline && <OfflineBanner />}
      <header className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 border-b border-slate-200 p-4">
        <nav aria-label="Główna nawigacja" className="flex flex-wrap gap-4">
          <NavLink
            to="/"
            end
            className="rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            Start
          </NavLink>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <DemoRoleSelect />
      </header>
      <main className="mx-auto max-w-3xl p-8">
        <Outlet />
      </main>
    </>
  );
}
