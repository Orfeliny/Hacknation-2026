const featureSources = import.meta.glob<string>("../*/feature.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});

// Stand-in for the shell's useRouteRegistered (task 05e); reads the feature sources
// because importing the registry from a feature would create an import cycle.
export function isRouteRegistered(path: string): boolean {
  return Object.values(featureSources).some((source) =>
    source.includes(`path: "${path}"`),
  );
}
