import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ROLE_VALUES, setDemoRole } from "../lib/demoRole";
import { buildRoutes, collectFeatures } from "./router";

const useQueryMock = vi.hoisted(() => vi.fn());
const aiStatusMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/backend/aiStatus", () => ({
  useAiStatus: (): unknown => aiStatusMock(),
}));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: useQueryMock,
}));

function renderAt(
  path: string,
  offline: boolean,
  features = collectFeatures({}),
) {
  const router = createMemoryRouter(buildRoutes(features, offline), {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

describe("app shell", () => {
  beforeEach(() => {
    aiStatusMock.mockReturnValue({
      data: { state: "mock", provider: "mock", model: "mock" },
      isDemo: true,
      offline: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    useQueryMock.mockReset();
    setDemoRole("supervisor");
    window.localStorage.clear();
  });

  it("shows the offline banner and no backend status when offline", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderAt("/", true);
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(screen.queryByText(/Backend połączony/)).not.toBeInTheDocument();
    expect(useQueryMock).not.toHaveBeenCalled();
  });

  it("shows the backend status with the note count when online", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    useQueryMock.mockReturnValue([{}, {}, {}]);
    renderAt("/", false);
    expect(screen.queryByText(/Tryb offline/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Backend połączony - 3 notatek"),
    ).toBeInTheDocument();
  });

  it("shows a loading state while the query is pending", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    useQueryMock.mockReturnValue(undefined);
    renderAt("/", false);
    expect(screen.getByText(/Łączenie z backendem/)).toBeInTheDocument();
  });

  it("renders the not-found page with a link home", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderAt("/nope", true);
    expect(
      screen.getByRole("heading", { name: "Nie znaleziono strony" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Wróć na stronę główną" }),
    ).toHaveAttribute("href", "/");
  });

  it("adds a fixture feature to routes and nav without touching the router", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    const features = collectFeatures({
      "../features/demo/feature.tsx": {
        default: {
          path: "/demo",
          navLabel: "Demo",
          order: 1,
          element: <h1>Demo page</h1>,
        },
      },
    });
    renderAt("/demo", true, features);
    expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute(
      "href",
      "/demo",
    );
    expect(
      screen.getByRole("heading", { name: "Demo page" }),
    ).toBeInTheDocument();
  });

  it("orders features by `order` and rejects invalid modules", () => {
    const make = (path: string, order: number) => ({
      default: { path, navLabel: path, order, element: <p /> },
    });
    const sorted = collectFeatures({
      a: make("/b", 2),
      b: make("/a", 1),
    });
    expect(sorted.map((f) => f.path)).toEqual(["/a", "/b"]);
    expect(() => collectFeatures({ bad: { default: { path: "x" } } })).toThrow(
      /Invalid feature module bad/,
    );
  });

  it("drops devOnly features from production builds", () => {
    const modules = {
      dev: {
        default: {
          path: "/dev/x",
          navLabel: "Dev",
          order: 1,
          element: <p />,
          devOnly: true,
        },
      },
      app: {
        default: { path: "/app", navLabel: "App", order: 2, element: <p /> },
      },
    };
    expect(collectFeatures(modules, false).map((f) => f.path)).toEqual([
      "/app",
    ]);
    expect(collectFeatures(modules, true).map((f) => f.path)).toEqual([
      "/dev/x",
      "/app",
    ]);
  });
});

describe("R1 shell", () => {
  const feature = (
    path: string,
    navLabel: string,
    order: number,
    extra: Record<string, unknown> = {},
  ) => ({
    default: { path, navLabel, order, element: <h1>{navLabel}</h1>, ...extra },
  });
  const roleFeatures = () =>
    collectFeatures({
      dash: feature("/pulpit", "Pulpit", 1, {
        roles: ["supervisor"],
        startFor: ["supervisor"],
      }),
      mine: feature("/moja-ocena", "Moja ocena", 2, {
        roles: ["employee"],
        startFor: ["employee"],
      }),
      shared: feature("/porady", "Porady", 3),
      sub: feature("/podglad", "Podgląd", 4, { hideInNav: true }),
      reg: feature("/przepisy", "Przepisy", 5),
    });
  const sideNav = () =>
    within(screen.getByRole("navigation", { name: "Główna nawigacja" }))
      .getAllByRole("link")
      .map((link) => link.textContent);

  beforeEach(() => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    aiStatusMock.mockReturnValue({
      data: { state: "mock", provider: "mock", model: "mock" },
      isDemo: true,
      offline: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setDemoRole("supervisor");
    window.localStorage.clear();
  });

  it("R1.1 makes the skip link the first Tab stop and moves focus to main#tresc", async () => {
    const user = userEvent.setup();
    renderAt("/", true);
    await user.tab();
    expect(
      screen.getByRole("link", { name: "Przejdź do treści" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(document.querySelector("main#tresc")).toHaveFocus();
  });

  it("R1.2 sets the role and opens its start feature from a role tab", async () => {
    const user = userEvent.setup();
    renderAt("/porady", true, roleFeatures());
    const tabs = within(
      screen.getByRole("navigation", { name: "Rola (widok demonstracyjny)" }),
    );
    expect(tabs.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Przełożony",
      "Pracownik",
      "Kadry",
      "Dyrektor",
      "Administrator",
    ]);
    await user.click(tabs.getByRole("link", { name: "Pracownik" }));
    expect(
      await screen.findByRole("heading", { name: "Moja ocena" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("demoRole")).toBe("employee");
    expect(tabs.getByRole("link", { name: "Pracownik" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(tabs.getByRole("link", { name: "Przełożony" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("R1.3 lists only features for the role and not the hideInNav ones", async () => {
    const user = userEvent.setup();
    renderAt("/porady", true, roleFeatures());
    expect(sideNav()).toEqual(["Pulpit", "Porady", "Przepisy"]);
    await user.click(screen.getByRole("link", { name: "Pracownik" }));
    expect(sideNav()).toEqual(["Moja ocena", "Porady", "Przepisy"]);
  });

  it("R1.3 combines the role filter with the challenge profile", () => {
    const features = collectFeatures({
      ...Object.fromEntries(
        roleFeatures().map((f) => [f.path, { default: f }]),
      ),
      team: feature("/hr-partner", "HR partner", 6, {
        roles: ["supervisor"],
        profiles: ["asystent"],
      }),
    });
    renderAt("/porady", true, features);
    expect(sideNav()).toContain("HR partner");
    cleanup();
    renderAt("/porady?profil=kompas", true, features);
    expect(sideNav()).not.toContain("HR partner");
    expect(sideNav()).toContain("Pulpit");
  });

  it("R1.4 redirects / to the start feature of the current role", async () => {
    renderAt("/", true, roleFeatures());
    expect(
      await screen.findByRole("heading", { name: "Pulpit" }),
    ).toBeInTheDocument();
  });

  it("R1.4 keeps the home page when the role has no start feature", () => {
    setDemoRole("director");
    renderAt("/", true, roleFeatures());
    expect(
      screen.getByRole("heading", { name: "HackNation Starter" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["mock", "AI demonstracyjne"],
    ["local", "AI: model lokalny, dane w sieci urzędu"],
    ["external", "AI: model zewnętrzny, dane pseudonimizowane"],
  ] as const)("R1.5 shows the %s state as text", (state, text) => {
    aiStatusMock.mockReturnValue({
      data: { state, provider: "openai-compatible", model: "m", host: "h" },
      isDemo: false,
      offline: false,
    });
    renderAt("/", true);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("R1.5 shows an unknown state while loading and an invalid one as text", () => {
    aiStatusMock.mockReturnValue({
      data: undefined,
      isDemo: false,
      offline: false,
    });
    const view = renderAt("/", true);
    expect(screen.getByText("AI: sprawdzanie stanu")).toBeInTheDocument();
    view.unmount();
    aiStatusMock.mockReturnValue({
      data: { state: "invalid", message: "zła konfiguracja" },
      isDemo: false,
      offline: false,
    });
    renderAt("/", true);
    expect(screen.getByText("AI: błędna konfiguracja")).toBeInTheDocument();
  });

  it("R1.6 shows only footer links whose route is registered", () => {
    renderAt("/", true, roleFeatures());
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Przepisy",
    ]);
  });

  it("R1.6 renders no footer when none of its routes exist", () => {
    renderAt("/", true);
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("R1.7 treats a module without roles, startFor and hideInNav as today", () => {
    const features = collectFeatures({ a: feature("/oceny", "Oceny", 1) });
    for (const role of DEMO_ROLE_VALUES) {
      setDemoRole(role);
      const view = renderAt("/", true, features);
      expect(sideNav()).toEqual(["Start", "Oceny"]);
      expect(screen.getByText("HackNation Starter")).toBeInTheDocument();
      view.unmount();
    }
  });

  it("R1.8 renders every registered path under every role", () => {
    const features = roleFeatures();
    const headings = ["Pulpit", "Moja ocena", "Porady", "Podgląd", "Przepisy"];
    for (const role of DEMO_ROLE_VALUES) {
      setDemoRole(role);
      for (const [index, f] of features.entries()) {
        const view = renderAt(f.path, true, features);
        expect(
          screen.getByRole("heading", { level: 1, name: headings[index] }),
        ).toBeInTheDocument();
        view.unmount();
      }
    }
  });

  it("rejects an unknown role in a feature module", () => {
    expect(() =>
      collectFeatures({ bad: feature("/x", "X", 1, { roles: ["ceo"] }) }),
    ).toThrow(/Invalid feature module bad: roles\.0/);
  });
});
