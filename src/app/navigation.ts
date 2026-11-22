import {
  isVisibleIn,
  type ChallengeProfile,
  type FeatureProfile,
} from "../lib/challengeProfile";
import type { DemoRole } from "../lib/demoRole";

export type NavGroup = "work" | "help";
export type NavHide = { profile: FeatureProfile; roles: DemoRole[] };

export type NavItem = {
  path: string;
  label: string;
  order: number;
  profiles?: readonly FeatureProfile[] | undefined;
  roles?: readonly DemoRole[] | undefined;
  startFor?: readonly DemoRole[] | undefined;
  hideInNav?: boolean | undefined;
  navGroup?: NavGroup | undefined;
  navHide?: readonly NavHide[] | undefined;
  layout?: "bare" | undefined;
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
  return nav
    .filter(
      (item) =>
        !item.hideInNav &&
        (item.roles === undefined || item.roles.includes(role)) &&
        isVisibleIn(item.profiles, profile) &&
        !item.navHide?.some(
          (hide) => hide.profile === profile && hide.roles.includes(role),
        ),
    )
    .sort(
      (a, b) =>
        Number(a.navGroup === "help") - Number(b.navGroup === "help") ||
        a.order - b.order,
    );
}
