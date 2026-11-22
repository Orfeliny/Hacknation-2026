import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ONBOARDING_STORAGE_PREFIX,
  isOnboardingDone,
  markOnboardingDone,
  resetOnboarding,
} from "./onboarding";

afterEach(() => {
  vi.restoreAllMocks();
  resetOnboarding("hr");
  resetOnboarding("employee");
  window.localStorage.clear();
});

describe("onboarding flag", () => {
  it("is off for a role that has not seen it", () => {
    expect(isOnboardingDone("hr")).toBe(false);
  });

  it("is kept separately for each role", () => {
    markOnboardingDone("hr");
    expect(isOnboardingDone("hr")).toBe(true);
    expect(isOnboardingDone("employee")).toBe(false);
    expect(window.localStorage.getItem(`${ONBOARDING_STORAGE_PREFIX}hr`)).toBe(
      "1",
    );
  });

  it("can be reset for the current role only", () => {
    markOnboardingDone("hr");
    markOnboardingDone("employee");
    resetOnboarding("hr");
    expect(isOnboardingDone("hr")).toBe(false);
    expect(isOnboardingDone("employee")).toBe(true);
  });

  it("falls back to memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isOnboardingDone("hr")).toBe(false);
    markOnboardingDone("hr");
    expect(isOnboardingDone("hr")).toBe(true);
  });
});
