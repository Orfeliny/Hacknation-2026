import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setDemoRole } from "../lib/demoRole";
import { buildRoutes, collectFeatures } from "./router";

vi.mock("../lib/backend/aiStatus", () => ({
  useAiStatus: (): unknown => ({
    data: { state: "mock", provider: "mock", model: "mock" },
    isDemo: true,
    offline: true,
  }),
}));

const features = collectFeatures({
  "../features/a/feature.tsx": {
    default: {
      path: "/a",
      navLabel: "A",
      order: 1,
      element: <p>Strona A</p>,
      overlay: <p>Nakładka</p>,
    },
  },
  "../features/zasady/feature.tsx": {
    default: {
      path: "/zasady",
      navLabel: "Zasady",
      order: 2,
      element: <p>Zasady</p>,
    },
  },
});

function renderShell() {
  const router = createMemoryRouter(buildRoutes(features, true), {
    initialEntries: ["/a"],
  });
  return render(<RouterProvider router={router} />);
}

describe("print: only the page content", () => {
  afterEach(() => {
    cleanup();
    setDemoRole("supervisor");
    window.localStorage.clear();
  });

  it("hides every shell part from paper", () => {
    renderShell();
    const hiddenOnPaper = [
      screen.getByRole("link", { name: "Przejdź do treści" }),
      screen.getByRole("banner").parentElement,
      screen.getByRole("status").parentElement,
      screen.getByRole("navigation", { name: "Główna nawigacja" }),
      screen.getByRole("contentinfo"),
      screen.getByText("Nakładka").parentElement,
    ];
    for (const element of hiddenOnPaper) {
      expect(element).toHaveClass("print:hidden");
    }
  });

  it("lets main span the page and keeps it visible", () => {
    renderShell();
    const main = screen.getByRole("main");
    expect(main).not.toHaveClass("print:hidden");
    expect(main.parentElement).toHaveClass(
      "print:block",
      "print:max-w-none",
      "print:p-0",
    );
  });
});
