import { useEffect } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router";
import {
  PROFILES,
  PROFILE_LABELS,
  isVisibleIn,
  profileFromSearch,
  setProfile,
  useChallengeProfile,
  type ChallengeProfile,
  type FeatureProfile,
} from "../lib/challengeProfile";
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
    <label className="flex items-center gap-2 text-sm text-slate-600">
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

function ProfileSelect() {
  const profile = useChallengeProfile();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Profil
      <select
        value={profile}
        onChange={(event) => setProfile(event.target.value as ChallengeProfile)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        {PROFILES.map((option) => (
          <option key={option} value={option}>
            {PROFILE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

// A submission link such as `?profil=kompas` opens the right menu; an unknown value is ignored.
function useProfileFromUrl() {
  const [params] = useSearchParams();
  const requested = profileFromSearch(params);
  useEffect(() => {
    if (requested) setProfile(requested);
  }, [requested]);
}

export type NavItem = {
  path: string;
  label: string;
  profiles?: readonly FeatureProfile[] | undefined;
};

export function Layout({ nav, offline }: { nav: NavItem[]; offline: boolean }) {
  useProfileFromUrl();
  const profile = useChallengeProfile();
  return (
    <>
      {offline && <OfflineBanner />}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 p-4">
          <nav aria-label="Główna nawigacja" className="flex flex-wrap gap-4">
            <NavLink
              to="/"
              end
              className="rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              Start
            </NavLink>
            {nav
              .filter((item) => isVisibleIn(item.profiles, profile))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600"
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <ProfileSelect />
            <DemoRoleSelect />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-8">
        <Outlet />
      </main>
    </>
  );
}
