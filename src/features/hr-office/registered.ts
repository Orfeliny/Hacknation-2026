const featureFiles = Object.keys(import.meta.glob("../*/feature.tsx"));

// Stand-in for the shell's `useRouteRegistered` (Amendment 9); remove it when that lands.
export function isFeatureRegistered(dir: string): boolean {
  return featureFiles.includes(`../${dir}/feature.tsx`);
}
