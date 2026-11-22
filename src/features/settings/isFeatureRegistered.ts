// Feature dirs register by file name (`../<dir>/feature.tsx`). A lazy glob lists
// them without importing, so there is no cycle with the router.
const registeredDirs = new Set(
  Object.keys(import.meta.glob("../*/feature.tsx")).map(
    (file) => file.split("/")[1],
  ),
);

export function isFeatureRegistered(dir: string): boolean {
  return registeredDirs.has(dir);
}
