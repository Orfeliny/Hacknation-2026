import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GrowthPage } from "./GrowthPage";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
}));

const base = {
  _creationTime: 1,
  level: "podstawowy",
  cost: "brak_danych",
  active: true,
};

const demo = {
  ...base,
  _id: "o1",
  title: "Szkolenie z negocjacji",
  description: "Ogólne szkolenie z negocjacji.",
  form: "szkolenie",
  criterionIds: ["negocjowanie", "komunikacja"],
  source: "demo",
};

const material = {
  ...base,
  _id: "o2",
  title: "Mentoring wewnętrzny",
  description: "Wymiana doświadczeń.",
  form: "mentoring",
  criterionIds: ["wspolpraca"],
  source: "material_kprm",
  sourceRef: "standardy-zarzadzania-zasobami-ludzkimi.md, pkt 1 lit. d",
};

type Served = { list?: unknown; one?: unknown };

function serve({ list, one }: Served) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(fn) === "growth/options:listOptions" ? list : one,
  );
}

const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");

const renderAt = (path = "/rozwoj") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <GrowthPage />
    </MemoryRouter>,
  );

const lastListArgs = () => {
  const calls = mocks.useQuery.mock.calls.filter(
    ([fn]) =>
      getFunctionName(fn as Parameters<typeof getFunctionName>[0]) ===
      "growth/options:listOptions",
  );
  return calls[calls.length - 1]?.[1] as unknown;
};

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.useQuery.mockReset();
});

describe("GrowthPage catalog", () => {
  it("shows an offline notice and sets the page title", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderAt();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(document.title).toBe("Forum rozwoju — Azymut");
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("lists entries with form, level, cost, criteria and source", () => {
    online();
    serve({ list: [demo, material] });
    renderAt();
    expect(screen.getByText("2 oferty")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Szkolenie z negocjacji" }),
    ).toHaveAttribute("href", "/rozwoj?wpis=o1");
    expect(screen.getByText("Negocjowanie, Komunikacja")).toBeInTheDocument();
    const items = within(
      screen.getByRole("region", { name: "Oferty" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent("Mentoring");
    expect(items[1]).toHaveTextContent("Podstawowy");
    expect(items[1]).not.toHaveTextContent("Brak danych");
  });

  it("marks demo entries as demonstration data and others by their source", () => {
    online();
    serve({ list: [demo, material] });
    renderAt();
    const offers = within(screen.getByRole("region", { name: "Oferty" }));
    expect(offers.getAllByText(/^Dane demonstracyjne/)).toHaveLength(1);
    expect(screen.getByText("Materiał KPRM")).toBeInTheDocument();
  });

  it("says the catalog is empty, without an error", () => {
    online();
    serve({ list: [] });
    renderAt();
    expect(screen.getByRole("status")).toHaveTextContent("Katalog jest pusty");
  });

  it("waits while the catalog loads", () => {
    online();
    serve({ list: undefined });
    renderAt();
    expect(screen.getByText("Ładowanie katalogu…")).toBeInTheDocument();
  });

  it("has labelled filter fields that are reachable in order from the keyboard", async () => {
    online();
    serve({ list: [demo] });
    renderAt();
    const labels = [
      "Typ",
      "Kryterium",
      "Poziom",
      "Bezpłatne",
      "Płatne",
      "Szukaj w tytule i opisie",
    ];
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    screen.getByLabelText(labels[0]!).focus();
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toHaveFocus();
      await userEvent.tab();
    }
  });

  it("sends only the chosen filters to the query and clears them", async () => {
    online();
    serve({ list: [demo] });
    renderAt();
    expect(lastListArgs()).toEqual({});
    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium"),
      "komunikacja",
    );
    expect(lastListArgs()).toEqual({ criterionId: "komunikacja" });
    await userEvent.selectOptions(screen.getByLabelText("Typ"), "szkolenie");
    await userEvent.type(
      screen.getByLabelText("Szukaj w tytule i opisie"),
      "negocj",
    );
    expect(lastListArgs()).toEqual({
      criterionId: "komunikacja",
      form: "szkolenie",
      search: "negocj",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Wyczyść filtry" }),
    );
    expect(lastListArgs()).toEqual({});
    expect(screen.getByLabelText("Typ")).toHaveValue("");
  });

  it("keeps the filters when an entry is opened and the user comes back", async () => {
    online();
    serve({ list: [demo], one: demo });
    renderAt();
    await userEvent.selectOptions(screen.getByLabelText("Typ"), "szkolenie");
    await userEvent.click(
      screen.getByRole("link", { name: "Szkolenie z negocjacji" }),
    );
    expect(screen.queryByLabelText("Typ")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Cały katalog" }));
    expect(screen.getByLabelText("Typ")).toHaveValue("szkolenie");
  });

  it("explains an empty result of a filter and offers to clear it", async () => {
    online();
    serve({ list: [] });
    renderAt();
    await userEvent.click(screen.getByLabelText("Płatne"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Brak wpisów dla wybranych filtrów.",
    );
    expect(
      screen.getByRole("button", { name: "Wyczyść filtry" }),
    ).toBeInTheDocument();
  });
});

describe("GrowthPage detail", () => {
  it("shows the entry with its source and a way back", () => {
    online();
    serve({ list: [material] });
    renderAt("/rozwoj?wpis=o2");
    expect(
      screen.getByRole("heading", { name: "Mentoring wewnętrzny" }),
    ).toBeInTheDocument();
    expect(screen.getByText(material.sourceRef)).toBeInTheDocument();
    expect(screen.getByText("Współpraca")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cały katalog" })).toHaveAttribute(
      "href",
      "/rozwoj",
    );
    expect(screen.queryByText("Organizator")).not.toBeInTheDocument();
    expect(screen.queryByText("Strona")).not.toBeInTheDocument();
  });

  it("labels a demo entry as demonstration data", () => {
    online();
    serve({ list: [demo] });
    renderAt("/rozwoj?wpis=o1");
    expect(screen.getByText(/^Dane demonstracyjne/)).toBeInTheDocument();
  });

  it("links only a web address and shows the provider when a real source names them", () => {
    online();
    serve({
      list: [
        {
          ...material,
          source: "urzad",
          provider: "Szkoła Administracji",
          url: "https://example.org/kurs",
        },
      ],
    });
    renderAt("/rozwoj?wpis=o2");
    expect(screen.getByText("Szkoła Administracji")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /https:\/\/example\.org\/kurs/ }),
    ).toHaveAttribute("href", "https://example.org/kurs");
  });

  it("does not link an address that is not http or https", () => {
    online();
    serve({ list: [{ ...material, url: "javascript:alert(1)" }] });
    renderAt("/rozwoj?wpis=o2");
    expect(screen.queryByRole("link", { name: /javascript/ })).toBeNull();
  });

  it("says so when the entry is missing, and when the id is malformed", () => {
    online();
    serve({ list: [] });
    const { unmount } = renderAt("/rozwoj?wpis=gone");
    expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono wpisu");
    unmount();

    renderAt("/rozwoj?wpis=%%%");
    expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono wpisu");
  });
});
