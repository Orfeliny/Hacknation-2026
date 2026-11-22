import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { AiBadge, type AiMode } from "../components/ui/AiBadge";
import { Select } from "../components/ui/Select";
import { useAiStatus } from "../lib/backend/aiStatus";
import {
  PROFILES,
  PROFILE_LABELS,
  profileFromSearch,
  setProfile,
  useChallengeProfile,
  type ChallengeProfile,
} from "../lib/challengeProfile";
import { DEMO_PERSONAS, useDemoRole } from "../lib/demoRole";
import { resetOnboarding } from "../lib/onboarding";
import { Button } from "../components/ui/Button";
import logo160 from "./assets/azymut-logo-160.png";
import logo80 from "./assets/azymut-logo-80.png";
import type { NavItem } from "./navigation";
import { RoleTabs } from "./RoleTabs";

const OFFICE_NAME = "Kancelaria Prezesa Rady Ministrów";

function HeaderAiBadge() {
  const { data } = useAiStatus();
  const mode: AiMode = data === undefined ? "unknown" : data.state;
  return <AiBadge mode={mode} />;
}

function ProfileSelect() {
  const profile = useChallengeProfile();
  return (
    <label className="text-muted flex items-center gap-2 text-sm">
      Profil
      <Select
        value={profile}
        onChange={(event) => setProfile(event.target.value as ChallengeProfile)}
        className="w-auto"
      >
        {PROFILES.map((option) => (
          <option key={option} value={option}>
            {PROFILE_LABELS[option]}
          </option>
        ))}
      </Select>
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Header({ nav }: { nav: NavItem[] }) {
  useProfileFromUrl();
  const role = useDemoRole();
  const persona = DEMO_PERSONAS[role];
  return (
    <header className="border-divider border-b">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-10 py-3">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <img
            src={logo80}
            srcSet={`${logo80} 1x, ${logo160} 2x`}
            alt=""
            width={40}
            height={40}
          />
          <span className="flex flex-col leading-tight">
            <span className="text-primary text-lg font-bold">Azymut</span>
            <span className="text-muted text-sm">{OFFICE_NAME}</span>
          </span>
        </Link>
        <RoleTabs nav={nav} />
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <HeaderAiBadge />
          <details className="relative">
            <summary className="text-muted cursor-pointer text-sm">
              Narzędzia demo
            </summary>
            <div className="border-divider absolute right-0 z-10 mt-2 flex w-max flex-col gap-3 rounded-md border bg-white p-3 shadow-md">
              <ProfileSelect />
              <Button variant="ghost" onClick={() => resetOnboarding(role)}>
                Resetuj onboarding
              </Button>
            </div>
          </details>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-primary flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            >
              {initials(persona.name)}
            </span>
            <p className="flex flex-col text-sm leading-tight">
              <span className="font-semibold">{persona.name}</span>
              <span className="text-muted">{persona.position}</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
