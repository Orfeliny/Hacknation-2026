import { createContext, useContext } from "react";
import type { DemoRole } from "./demoRoles";

// Set by the login gate in `oidc` mode. `null` (the default) is the demo: every role is allowed and the
// persona is the seeded one.
export type Session = {
  roles: readonly DemoRole[];
  employee: { firstName: string; lastName: string; position: string };
};

export const SessionContext = createContext<Session | null>(null);

export const useSession = (): Session | null => useContext(SessionContext);
