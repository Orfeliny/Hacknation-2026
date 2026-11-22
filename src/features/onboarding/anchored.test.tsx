import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setProfile } from "../../lib/challengeProfile";
import { DEMO_ROLE_VALUES, setDemoRole } from "../../lib/demoRole";
import { resetOnboarding } from "../../lib/onboarding";
import { OnboardingDialog } from "./OnboardingDialog";
import { ONBOARDING_STEPS } from "./steps";

const ROLE_TABS_LABEL = "Rola (widok demonstracyjny)";

function Shell() {
  return (
    <>
      <nav aria-label={ROLE_TABS_LABEL} data-testid="role-tabs">
        <a href="/">Przełożony</a>
      </nav>
      <nav aria-label="Główna nawigacja">
        <a href="/oceny" data-testid="nav-oceny">
          Oceny
        </a>
      </nav>
      <OnboardingDialog />
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  setProfile("all");
  setDemoRole("supervisor");
  for (const role of DEMO_ROLE_VALUES) resetOnboarding(role);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("step targets", () => {
  it("gives every step a target", () => {
    for (const steps of Object.values(ONBOARDING_STEPS)) {
      for (const step of steps) expect(step.target).toBeTruthy();
    }
  });
});

describe("anchored OnboardingDialog", () => {
  it("places the dialog next to its target and points at it", async () => {
    render(<Shell />);
    const tabs = screen.getByTestId("role-tabs");
    vi.spyOn(tabs, "getBoundingClientRect").mockReturnValue({
      top: 10,
      left: 300,
      width: 400,
      height: 44,
      right: 700,
      bottom: 54,
      x: 300,
      y: 10,
      toJSON: () => ({}),
    });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    const dialog = screen.getByRole("dialog", { name: "Witaj w Azymucie" });
    await waitFor(() => expect(dialog.style.top).toBe("70px"));
    expect(dialog.style.position).toBe("fixed");
    expect(
      dialog.querySelector("[data-onboarding-pointer='bottom']"),
    ).not.toBeNull();
    expect(tabs.style.outline).toContain("3px solid");
  });

  it("stays centred when the target is not on the page", () => {
    render(<OnboardingDialog />);
    const dialog = screen.getByRole("dialog", { name: "Witaj w Azymucie" });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(dialog.style.top).toBe("");
    expect(dialog.querySelector("[data-onboarding-pointer]")).toBeNull();
  });

  it("moves the outline to the next target and removes it when finished", async () => {
    render(<Shell />);
    const tabs = screen.getByTestId("role-tabs");
    const oceny = screen.getByTestId("nav-oceny");
    await waitFor(() => expect(tabs.style.outline).toContain("3px solid"));
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await waitFor(() => expect(oceny.style.outline).toContain("3px solid"));
    expect(tabs.style.outline).toBe("");
    await userEvent.click(screen.getByRole("button", { name: "Pomiń" }));
    expect(oceny.style.outline).toBe("");
  });
});
