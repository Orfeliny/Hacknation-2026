import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_STORAGE_KEY,
  getDemoRole,
  setDemoRole,
  useDemoRole,
} from "./demoRole";

describe("demo role store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("defaults to the supervisor", () => {
    expect(getDemoRole()).toBe(DEFAULT_DEMO_ROLE);
    expect(DEFAULT_DEMO_ROLE).toBe("supervisor");
  });

  it("notifies subscribed components and survives a remount", () => {
    const first = renderHook(() => useDemoRole());
    act(() => setDemoRole("hr"));
    expect(first.result.current).toBe("hr");
    first.unmount();

    const second = renderHook(() => useDemoRole());
    expect(second.result.current).toBe("hr");
    expect(window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY)).toBe("hr");
  });

  it("ignores an unknown stored value", () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "ceo");
    expect(getDemoRole()).toBe("supervisor");
  });

  it("falls back to the supervisor when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getDemoRole()).toBe("supervisor");
  });

  it("keeps the choice in memory when storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useDemoRole());
    act(() => setDemoRole("director"));
    expect(result.current).toBe("director");
  });
});
