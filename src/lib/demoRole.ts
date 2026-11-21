import { useSyncExternalStore } from "react";
import type { DemoRole } from "../../convex/lib/validators";

export type { DemoRole };

// Demo stand-in for login: the role picked in the header, kept per browser. Replaced by OIDC in #42.
export const DEMO_ROLES: { value: DemoRole; label: string }[] = [
  { value: "supervisor", label: "przełożony" },
  { value: "employee", label: "oceniany" },
  { value: "hr", label: "kadry" },
  { value: "director", label: "dyrektor" },
  { value: "admin", label: "administrator" },
];

export const DEFAULT_DEMO_ROLE: DemoRole = "supervisor";
export const DEMO_ROLE_STORAGE_KEY = "demoRole";

const listeners = new Set<() => void>();
// Used only when localStorage throws (private mode, blocked site data).
let unsavedRole: DemoRole | undefined;

function isDemoRole(value: unknown): value is DemoRole {
  return DEMO_ROLES.some((role) => role.value === value);
}

export function getDemoRole(): DemoRole {
  try {
    const stored = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    return isDemoRole(stored) ? stored : DEFAULT_DEMO_ROLE;
  } catch {
    return unsavedRole ?? DEFAULT_DEMO_ROLE;
  }
}

export function setDemoRole(role: DemoRole): void {
  try {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
  } catch {
    unsavedRole = role;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemoRole(): DemoRole {
  return useSyncExternalStore(subscribe, getDemoRole, () => DEFAULT_DEMO_ROLE);
}
