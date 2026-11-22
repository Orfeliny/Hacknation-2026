import { useEffect } from "react";
import { useSearchParams } from "react-router";
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
import logo160 from "./assets/azymut-logo-160.png";
import logo80 from "./assets/azymut-logo-80.png";
import type { NavItem } from "./navigation";
import { RoleTabs } from "./RoleTabs";

const OFFICE_NAME = "[NAZWA URZĘDU]";

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

export function Header({ nav }: { nav: NavItem[] }) {
  useProfileFromUrl();
  const persona = DEMO_PERSONAS[useDemoRole()];
  return (
    <header className="border-divider border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <div className="flex items-center gap-3">
          <img
            src={logo80}
            srcSet={`${logo80} 1x, ${logo160} 2x`}
            alt=""
            width={40}
            height={40}
          />
          <p className="text-lg font-bold">
            Azymut{" "}
            <span className="text-muted font-normal">/ {OFFICE_NAME}</span>
          </p>
        </div>
        <RoleTabs nav={nav} />
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <HeaderAiBadge />
          <ProfileSelect />
          <p className="text-sm">
            <span className="font-semibold">{persona.name}</span>
            <span className="text-muted">, {persona.position}</span>
          </p>
        </div>
      </div>
    </header>
  );
}
