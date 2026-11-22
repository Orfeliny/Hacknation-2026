import { render, screen, within } from "@testing-library/react";
import { ConvexError } from "convex/values";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRoutes, collectFeatures } from "./router";

function Boom({ error }: { error: unknown }): never {
  throw error;
}

function renderThrowing(error: unknown) {
  vi.stubEnv("VITE_CONVEX_URL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  const features = collectFeatures({
    a: {
      default: {
        path: "/oceny",
        navLabel: "Oceny",
        order: 1,
        element: <Boom error={error} />,
      },
    },
  });
  const router = createMemoryRouter(buildRoutes(features, true), {
    initialEntries: ["/oceny"],
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("RouteError", () => {
  it("shows a plain card inside the shell for an unexpected error", () => {
    renderThrowing(new Error("kaboom"));
    expect(
      screen.getByRole("heading", { level: 1, name: "Coś poszło nie tak" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /stronę startową/ }),
    ).toHaveAttribute("href", "/");
    expect(
      within(
        screen.getByRole("navigation", { name: "Główna nawigacja" }),
      ).getByRole("link", { name: "Oceny" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();
  });

  it("shows a denied ConvexError message as an info card", () => {
    renderThrowing(
      new ConvexError({
        code: "denied",
        message: "Brak dostępu do tej sprawy.",
      }),
    );
    expect(
      screen.getByText("Brak dostępu do tej sprawy.").closest("[role=status]"),
    ).toHaveTextContent("Brak dostępu do tej sprawy.");
  });

  it("shows Nie znaleziono for a malformed id", () => {
    renderThrowing(
      new Error(
        "[Request ID: r1] Server Error\nArgumentValidationError: bad id",
      ),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Nie znaleziono" }),
    ).toBeInTheDocument();
  });
});
