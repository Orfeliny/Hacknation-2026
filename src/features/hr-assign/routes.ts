type Registered = { path?: string } | readonly { path?: string }[];

// Stand-in for the shell's useRouteRegistered (task 05e in PR #88); delete it when that lands.
const modules = import.meta.glob<Registered>(
  ["../employee-card/feature.tsx", "../hr-office/feature.tsx"],
  { eager: true, import: "default" },
);

export function isRouteRegistered(path: string): boolean {
  return Object.values(modules).some((feature) =>
    [feature].flat().some((item) => item?.path === path),
  );
}

export const EMPLOYEE_CARD_PATH = "/kadry/pracownik";
export const HR_OFFICE_PATH = "/kadry";
