import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PROFILE_STORAGE_KEY,
  featureProfilesSchema,
  getProfile,
  isVisibleIn,
  parseProfile,
  profileFromSearch,
  setProfile,
  useChallengeProfile,
} from "./challengeProfile";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  setProfile("all");
  window.localStorage.clear();
});

describe("profile values", () => {
  it("accepts the three profiles and nothing else", () => {
    expect(parseProfile("kompas")).toBe("kompas");
    expect(parseProfile("asystent")).toBe("asystent");
    expect(parseProfile("all")).toBe("all");
    expect(parseProfile("kprm")).toBeUndefined();
    expect(parseProfile(null)).toBeUndefined();
  });

  it("reads the profile from ?profil= and ignores an unknown one", () => {
    expect(profileFromSearch(new URLSearchParams("profil=kompas"))).toBe(
      "kompas",
    );
    expect(profileFromSearch(new URLSearchParams("profil=x"))).toBeUndefined();
    expect(profileFromSearch(new URLSearchParams(""))).toBeUndefined();
  });

  it("shows a feature without profiles everywhere and others only in their profile", () => {
    for (const profile of ["all", "asystent", "kompas"] as const) {
      expect(isVisibleIn(undefined, profile)).toBe(true);
    }
    expect(isVisibleIn(["kompas"], "kompas")).toBe(true);
    expect(isVisibleIn(["kompas"], "asystent")).toBe(false);
    expect(isVisibleIn(["kompas"], "all")).toBe(true);
    expect(isVisibleIn(["asystent", "kompas"], "asystent")).toBe(true);
  });

  it("rejects an unknown or empty `profiles` value", () => {
    expect(featureProfilesSchema.safeParse(["kprm"]).success).toBe(false);
    expect(featureProfilesSchema.safeParse([]).success).toBe(false);
    expect(featureProfilesSchema.safeParse(undefined).success).toBe(true);
  });
});

describe("stored profile", () => {
  it("defaults to all and keeps the choice", () => {
    expect(getProfile()).toBe("all");
    setProfile("kompas");
    expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe("kompas");
    expect(getProfile()).toBe("kompas");
  });

  it("falls back to all for a garbage stored value", () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, "nope");
    expect(getProfile()).toBe("all");
  });

  it("keeps the choice in memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setProfile("asystent");
    expect(getProfile()).toBe("asystent");
  });

  it("updates components that use the hook", () => {
    const { result } = renderHook(() => useChallengeProfile());
    expect(result.current).toBe("all");
    act(() => setProfile("kompas"));
    expect(result.current).toBe("kompas");
  });
});
