import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: () => [],
}));

describe("App", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the shell offline", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(<App />);
    expect(screen.getAllByRole("banner")[0]).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Rola (widok demonstracyjny)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
  });
});
