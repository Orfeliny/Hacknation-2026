import { useSyncExternalStore } from "react";
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

export function useDemoRole(): DemoRole {
  return useSyncExternalStore(subscribe, getDemoRole, () => DEFAULT_DEMO_ROLE);
}
