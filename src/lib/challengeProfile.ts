import { useSyncExternalStore } from "react";
import { z } from "zod";

export const FEATURE_PROFILES = ["asystent", "kompas"] as const;
export const PROFILES = ["all", ...FEATURE_PROFILES] as const;

export type FeatureProfile = (typeof FEATURE_PROFILES)[number];
export type ChallengeProfile = (typeof PROFILES)[number];

export const DEFAULT_PROFILE: ChallengeProfile = "all";
export const PROFILE_STORAGE_KEY = "challengeProfile";
export const PROFILE_URL_PARAM = "profil";

export const PROFILE_LABELS: Record<ChallengeProfile, string> = {
  all: "Wszystkie moduły",
  asystent: "Asystent KPRM",
  kompas: "Kompas MC",
};

// `profiles` on a feature: absent means "every profile".
export const featureProfilesSchema = z
  .array(z.enum(FEATURE_PROFILES))
  .min(1, "profiles must not be empty")
  .optional();

export const PROFILE_START: Record<
  FeatureProfile,
  { path: string; title: string; text: string; cta: string }
> = {
  kompas: {
    path: "/oceny",
    title: "Zacznij od wyboru ścieżki",
    text: "Pierwsza ocena w służbie cywilnej albo ocena okresowa.",
    cta: "Przejdź do ocen",
  },
  asystent: {
    path: "/hr-partner",
    title: "Zacznij od swojego zespołu",
    text: "Sygnały i podpowiedzi dla Twoich pracowników.",
    cta: "Mój zespół",
  },
};

const profileSchema = z.enum(PROFILES);

export function parseProfile(value: unknown): ChallengeProfile | undefined {
  const parsed = profileSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function isVisibleIn(
  featureProfiles: readonly FeatureProfile[] | undefined,
  profile: ChallengeProfile,
): boolean {
  return (
    profile === "all" ||
    featureProfiles === undefined ||
    featureProfiles.includes(profile)
  );
}

export function profileFromSearch(
  search: URLSearchParams,
): ChallengeProfile | undefined {
  return parseProfile(search.get(PROFILE_URL_PARAM));
}

const listeners = new Set<() => void>();
// The last choice that could not be written (private mode, full or blocked storage).
let unsavedProfile: ChallengeProfile | undefined;

export function getProfile(): ChallengeProfile {
  if (unsavedProfile) return unsavedProfile;
  try {
    return (
      parseProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY)) ??
      DEFAULT_PROFILE
    );
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function setProfile(profile: ChallengeProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, profile);
    unsavedProfile = undefined;
  } catch {
    unsavedProfile = profile;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChallengeProfile(): ChallengeProfile {
  return useSyncExternalStore(subscribe, getProfile, () => DEFAULT_PROFILE);
}
