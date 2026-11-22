import { createContext, useContext } from "react";

export const RouteRegistryContext = createContext<readonly string[]>([]);

export function useRegisteredPaths(): readonly string[] {
  return useContext(RouteRegistryContext);
}

// Views can link to screens that another task adds; until then the link is left out, not a 404.
export function useRouteRegistered(path: string): boolean {
  const registered = useRegisteredPaths();
  const pathname = path.split(/[?#]/)[0] ?? path;
  return pathname === "/" || registered.includes(pathname);
}
