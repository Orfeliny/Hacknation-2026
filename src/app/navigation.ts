import {
  isVisibleIn,
  type ChallengeProfile,
  type FeatureProfile,
} from "../lib/challengeProfile";
import type { DemoRole } from "../lib/demoRole";

export type NavItem = {
  path: string;
  label: string;
  order: number;
  profiles?: readonly FeatureProfile[] | undefined;
  roles?: readonly DemoRole[] | undefined;
  startFor?: readonly DemoRole[] | undefined;
  hideInNav?: boolean | undefined;
};

export function startPathFor(
  nav: readonly NavItem[],
  role: DemoRole,
): string | undefined {
  return nav.find((item) => item.startFor?.includes(role))?.path;
}

export function visibleNav(
  nav: readonly NavItem[],
  role: DemoRole,
  profile: ChallengeProfile,
): NavItem[] {
  return nav.filter(
    (item) =>
      !item.hideInNav &&
      (item.roles === undefined || item.roles.includes(role)) &&
      isVisibleIn(item.profiles, profile),
  );
}
