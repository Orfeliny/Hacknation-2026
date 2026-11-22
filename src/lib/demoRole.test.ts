import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_EMPLOYEES } from "../../convex/employees/seed";
import { SessionContext, type Session } from "./session";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_PERSONAS,
  DEMO_ROLE_VALUES,
  DEMO_ROLES,
  DEMO_ROLE_STORAGE_KEY,
  getDemoRole,
  setDemoRole,
  useDemoRole,
  type DemoRole,
} from "./demoRole";

describe("demo role store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setDemoRole(DEFAULT_DEMO_ROLE);
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

  it("keeps the choice when only the write fails, e.g. a full storage", () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "employee");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const { result } = renderHook(() => useDemoRole());
    act(() => setDemoRole("hr"));
    expect(result.current).toBe("hr");
  });
});

describe("demo personas", () => {
  it("covers every role and matches the demoPersona employees in the seed", () => {
    for (const { value } of DEMO_ROLES) {
      const seeded = DEMO_EMPLOYEES.find((e) => e.demoPersona === value);
      expect(seeded, value).toBeDefined();
      expect(DEMO_PERSONAS[value]).toEqual({
        name: `${seeded?.firstName} ${seeded?.lastName}`,
        position: seeded?.position,
      });
    }
  });

  it("keeps DEMO_ROLE_VALUES in step with DEMO_ROLES", () => {
    expect(DEMO_ROLES.map((r) => r.value)).toEqual([...DEMO_ROLE_VALUES]);
  });

  it("labels the five role tabs", () => {
    expect(DEMO_ROLES.map((r) => r.tabLabel)).toEqual([
      "Przełożony",
      "Pracownik",
      "Kadry",
      "Dyrektor",
      "Administrator",
    ]);
  });
});

describe("useDemoRole with a session", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  const session = (roles: DemoRole[]): Session => ({
    roles,
    employee: { firstName: "A", lastName: "B", position: "C" },
  });

  const wrapper =
    (value: Session | null) =>
    ({ children }: { children: ReactNode }) =>
      createElement(SessionContext, { value }, children);

  it("returns the stored role without a session (demo)", () => {
    setDemoRole("director");
    const { result } = renderHook(() => useDemoRole(), {
      wrapper: wrapper(null),
    });
    expect(result.current).toBe("director");
  });

  it("returns the stored role when the session allows it", () => {
    setDemoRole("hr");
    const { result } = renderHook(() => useDemoRole(), {
      wrapper: wrapper(session(["employee", "hr"])),
    });
    expect(result.current).toBe("hr");
  });

  it("falls back to the first allowed role when the stored one is not allowed", () => {
    setDemoRole("admin");
    const { result } = renderHook(() => useDemoRole(), {
      wrapper: wrapper(session(["supervisor", "employee"])),
    });
    expect(result.current).toBe("supervisor");
  });
});
