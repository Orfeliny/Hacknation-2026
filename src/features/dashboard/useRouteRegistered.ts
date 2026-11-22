import { useContext } from "react";
import { matchRoutes, UNSAFE_DataRouterContext } from "react-router";

// Views can link to screens that another task adds; until then the link is left out, not a 404.
export function useRouteRegistered(path: string): boolean {
  const routes = useContext(UNSAFE_DataRouterContext)?.router.routes;
  const pathname = path.split("?")[0] ?? path;
  const match = routes ? matchRoutes(routes, pathname) : null;
  return match?.at(-1)?.route.path !== "*" && match !== null;
}
