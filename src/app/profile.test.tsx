import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setProfile } from "../lib/challengeProfile";
import { buildRoutes, collectFeatures } from "./router";

const feature = (
  path: string,
  navLabel: string,
  order: number,
  profiles?: string[],
) => ({
  default: {
    path,
    navLabel,
    order,
    element: <p>{navLabel}</p>,
    ...(profiles ? { profiles } : {}),
  },
});

const modules = {
  a: feature("/oceny", "Oceny", 1),
  b: feature("/hr-partner", "HR partner", 2, ["asystent"]),
  c: feature("/kompetencje", "Kompetencje", 3, ["kompas"]),
  d: feature("/wspolne", "Wspólne", 4, ["asystent", "kompas"]),
};

function renderAt(path: string, features = collectFeatures(modules)) {
  vi.stubEnv("VITE_CONVEX_URL", "");
  const router = createMemoryRouter(buildRoutes(features, true), {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

const menu = () =>
  within(screen.getByRole("navigation", { name: "Główna nawigacja" }))
    .getAllByRole("link")
    .map((link) => link.textContent)
    .filter((text) => text !== "Start");

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  setProfile("all");
  window.localStorage.clear();
});

describe("challenge profile in the menu", () => {
  it("shows every module by default", () => {
    renderAt("/");
    expect(menu()).toEqual(["Oceny", "HR partner", "Kompetencje", "Wspólne"]);
  });

  it("?profil=kompas shows the Kompas modules and the ones without a profile", () => {
    renderAt("/?profil=kompas");
    expect(menu()).toEqual(["Oceny", "Kompetencje", "Wspólne"]);
  });

  it("?profil=asystent shows the Asystent modules and the ones without a profile", () => {
    renderAt("/?profil=asystent");
    expect(menu()).toEqual(["Oceny", "HR partner", "Wspólne"]);
  });

  it("keeps the profile after a reload without the parameter", () => {
    renderAt("/?profil=kompas").unmount();
    renderAt("/");
    expect(menu()).toEqual(["Oceny", "Kompetencje", "Wspólne"]);
  });

  it("ignores an unknown ?profil= value", () => {
    renderAt("/?profil=kprm");
    expect(menu()).toEqual(["Oceny", "HR partner", "Kompetencje", "Wspólne"]);
  });

  it("switches the profile with the select in the header", async () => {
    renderAt("/");
    await userEvent.selectOptions(screen.getByLabelText("Profil"), "kompas");
    expect(menu()).toEqual(["Oceny", "Kompetencje", "Wspólne"]);
  });

  it("does not hide a route from a direct link", () => {
    renderAt("/hr-partner?profil=kompas");
    expect(
      screen.getByText("HR partner", { selector: "p" }),
    ).toBeInTheDocument();
  });
});

describe("features and their `profiles`", () => {
  it("keeps a feature without `profiles` visible in every profile", () => {
    const features = collectFeatures({ a: feature("/oceny", "Oceny", 1) });
    for (const profile of ["asystent", "kompas"]) {
      const view = renderAt(`/?profil=${profile}`, features);
      expect(menu()).toEqual(["Oceny"]);
      view.unmount();
    }
  });

  it("fails with the field path for an invalid value", () => {
    expect(() =>
      collectFeatures({ bad: feature("/x", "X", 1, ["kprm"]) }),
    ).toThrow(/Invalid feature module bad: profiles\.0/);
    expect(() => collectFeatures({ bad: feature("/x", "X", 1, []) })).toThrow(
      /profiles: profiles must not be empty/,
    );
  });
});

describe("start page per profile", () => {
  it("shows nothing extra for all", () => {
    renderAt("/");
    expect(screen.queryByText(/Zacznij od/)).not.toBeInTheDocument();
  });

  it("Kompas starts with the choice of the path", () => {
    renderAt("/?profil=kompas");
    expect(screen.getByText("Zacznij od wyboru ścieżki")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Przejdź do ocen" }),
    ).toHaveAttribute("href", "/oceny");
  });

  it("Asystent starts with my team", () => {
    renderAt("/?profil=asystent");
    expect(screen.getByText("Zacznij od swojego zespołu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mój zespół" })).toHaveAttribute(
      "href",
      "/hr-partner",
    );
  });

  it("does not link to a module that is not installed", () => {
    renderAt("/?profil=asystent", collectFeatures({ a: modules.a }));
    expect(screen.queryByText(/Zacznij od/)).not.toBeInTheDocument();
  });
});
