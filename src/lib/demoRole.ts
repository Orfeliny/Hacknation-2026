import { useSyncExternalStore } from "react";
import { useSession } from "./session";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_STORAGE_KEY,
  DEMO_ROLES,
  type DemoRole,
} from "./demoRoles";

export * from "./demoRoles";

const listeners = new Set<() => void>();
// The last choice that could not be written (private mode, full or blocked storage).
let unsavedRole: DemoRole | undefined;

function isDemoRole(value: unknown): value is DemoRole {
  return DEMO_ROLES.some((role) => role.value === value);
}

export function getDemoRole(): DemoRole {
  if (unsavedRole) return unsavedRole;
  try {
    const stored = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    return isDemoRole(stored) ? stored : DEFAULT_DEMO_ROLE;
  } catch {
    return DEFAULT_DEMO_ROLE;
  }
}

export function setDemoRole(role: DemoRole): void {
  try {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
    unsavedRole = undefined;
  } catch {
    unsavedRole = role;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// In `oidc` mode a stored role the signed-in user may not act in (another account's choice, a role taken
// away) is replaced by the first allowed one, so no screen asks the backend for a role it will refuse.
export function useDemoRole(): DemoRole {
  const stored = useSyncExternalStore(
    subscribe,
    getDemoRole,
    () => DEFAULT_DEMO_ROLE,
  );
  const session = useSession();
  if (!session || session.roles.includes(stored)) return stored;
  return session.roles[0] ?? stored;
}
