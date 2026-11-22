import { useSyncExternalStore } from "react";
import type { DemoRole } from "./demoRole";

// Demo stand-in until login exists (#42): "seen" is kept per demo role in this browser, so switching to a
// role that has not been seen yet shows its onboarding as a first login would.
export const ONBOARDING_STORAGE_PREFIX = "onboardingDone:";

const listeners = new Set<() => void>();
// Roles whose flag could not be written (private mode, full or blocked storage).
const unsaved = new Map<DemoRole, boolean>();

const key = (role: DemoRole) => `${ONBOARDING_STORAGE_PREFIX}${role}`;

export function isOnboardingDone(role: DemoRole): boolean {
  const fallback = unsaved.get(role);
  if (fallback !== undefined) return fallback;
  try {
    return window.localStorage.getItem(key(role)) === "1";
  } catch {
    return false;
  }
}

function setDone(role: DemoRole, done: boolean): void {
  try {
    if (done) window.localStorage.setItem(key(role), "1");
    else window.localStorage.removeItem(key(role));
    unsaved.delete(role);
  } catch {
    unsaved.set(role, done);
  }
  listeners.forEach((listener) => listener());
}

export const markOnboardingDone = (role: DemoRole): void => setDone(role, true);
export const resetOnboarding = (role: DemoRole): void => setDone(role, false);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOnboardingDone(role: DemoRole): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isOnboardingDone(role),
    () => true,
  );
}
