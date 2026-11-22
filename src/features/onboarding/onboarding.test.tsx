import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setProfile } from "../../lib/challengeProfile";
import { DEMO_ROLE_VALUES, setDemoRole } from "../../lib/demoRole";
import {
  isOnboardingDone,
  markOnboardingDone,
  resetOnboarding,
} from "../../lib/onboarding";
import { OnboardingDialog } from "./OnboardingDialog";
import { OnboardingPage } from "./OnboardingPage";
import feature from "./feature";
import { ONBOARDING_STEPS, stepsFor } from "./steps";

beforeEach(() => {
  window.localStorage.clear();
  setProfile("all");
  setDemoRole("supervisor");
  for (const role of DEMO_ROLE_VALUES) resetOnboarding(role);
});

afterEach(() => {
  window.localStorage.clear();
});

describe("steps", () => {
  it.each(DEMO_ROLE_VALUES)("%s has 3 to 5 non-empty steps", (role) => {
    for (const profile of ["all", "asystent", "kompas"] as const) {
      const steps = stepsFor(role, profile);
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps.length).toBeLessThanOrEqual(5);
      for (const step of steps) {
        expect(step.title.trim()).not.toBe("");
        expect(step.text.trim()).not.toBe("");
      }
    }
  });

  it("shows the first-review step only in the Kompas profile", () => {
    const titles = (profile: "all" | "asystent" | "kompas") =>
      stepsFor("supervisor", profile).map((s) => s.title);
    expect(titles("kompas")).toContain("Pierwsza ocena");
    expect(titles("all")).toContain("Pierwsza ocena");
    expect(titles("asystent")).not.toContain("Pierwsza ocena");
  });

  it("covers every role and gives each its own set", () => {
    expect(Object.keys(ONBOARDING_STEPS).sort()).toEqual(
      [...DEMO_ROLE_VALUES].sort(),
    );
    const sets = new Set(
      Object.values(ONBOARDING_STEPS).map((steps) =>
        steps.map((s) => s.title).join("|"),
      ),
    );
    expect(sets.size).toBe(DEMO_ROLE_VALUES.length);
  });
});

describe("OnboardingDialog", () => {
  it("opens by itself for a role that has not seen it", () => {
    render(<OnboardingDialog />);
    expect(
      screen.getByRole("dialog", { name: "Witaj w Azymucie" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Krok 1 z 4")).toBeInTheDocument();
  });

  it("does not open for a role that has seen it", () => {
    markOnboardingDone("supervisor");
    render(<OnboardingDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("walks forward and back and finishes with 'Zaczynam'", async () => {
    render(<OnboardingDialog />);
    const back = screen.getByRole("button", { name: "Wstecz" });
    expect(back).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(back);
    expect(screen.getByText("Krok 1 z 4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByRole("dialog", { name: "Oceny" })).toBeInTheDocument();
    expect(screen.getByText("Krok 2 z 4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Wstecz" }));
    expect(
      screen.getByRole("dialog", { name: "Witaj w Azymucie" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.queryByRole("button", { name: "Dalej" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pomiń" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Zaczynam" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(isOnboardingDone("supervisor")).toBe(true);
  });

  it("can be skipped and stays skipped", async () => {
    const { unmount } = render(<OnboardingDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Pomiń" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
    render(<OnboardingDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("counts Esc as skipping", () => {
    render(<OnboardingDialog />);
    screen
      .getByRole("dialog", { name: "Witaj w Azymucie" })
      .dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(isOnboardingDone("supervisor")).toBe(true);
  });

  it("shows the onboarding of a role the first time it is switched to", async () => {
    markOnboardingDone("supervisor");
    const { rerender } = render(<OnboardingDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    setDemoRole("employee");
    rerender(<OnboardingDialog />);
    expect(
      await screen.findByText(/własną ocenę okresową/),
    ).toBeInTheDocument();
    expect(isOnboardingDone("supervisor")).toBe(true);
    expect(isOnboardingDone("employee")).toBe(false);
  });

  it("starts again from the first step after a reset", async () => {
    render(<OnboardingDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Dalej" }));
    await userEvent.click(screen.getByRole("button", { name: "Pomiń" }));
    act(() => resetOnboarding("supervisor"));
    expect(await screen.findByText("Krok 1 z 4")).toBeInTheDocument();
  });

  it("leaves out the Kompas step in the Asystent profile", () => {
    setProfile("asystent");
    render(<OnboardingDialog />);
    expect(screen.getByText("Krok 1 z 3")).toBeInTheDocument();
  });
});

describe("OnboardingPage and feature", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

  it("lists the steps of the current role under one h1", () => {
    setDemoRole("hr");
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const step of stepsFor("hr", "all")) {
      expect(
        screen.getByRole("heading", { level: 2, name: step.title }),
      ).toBeInTheDocument();
    }
  });

  it("reopens the dialog from the page button", async () => {
    markOnboardingDone("supervisor");
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Pokaż jako okno" }),
    );
    expect(isOnboardingDone("supervisor")).toBe(false);
  });

  it("registers a hidden page and the overlay", () => {
    expect(feature.path).toBe("/przewodnik");
    expect(feature.hideInNav).toBe(true);
    expect(feature.overlay).toBeDefined();
  });
});
