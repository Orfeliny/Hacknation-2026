import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvicePage } from "./AdvicePage";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
}));

const feedback = {
  _id: "a1",
  slug: "informacja-zwrotna",
  title: "Informacja zwrotna",
  summary: "Dwa rodzaje informacji zwrotnej.",
  topic: "informacja_zwrotna",
  criterionIds: ["komunikacja"],
  readingMinutes: 2,
  source: "material_kprm",
  sourceRef: "poradnik-oceny-okresowe.md, pkt 6.2.3",
};

const demo = {
  _id: "a2",
  slug: "docenianie",
  title: "Docenianie",
  summary: "O chwaleniu.",
  topic: "docenianie",
  criterionIds: [],
  source: "demo",
};

const full = {
  ...feedback,
  sections: [
    {
      heading: "Dwa rodzaje",
      paragraphs: ["Pierwszy akapit.", "Drugi akapit z <b>tagiem</b>."],
      bullets: ["Bieżąca.", "Cykliczna."],
    },
    {
      heading: "Jak przekazać",
      paragraphs: [],
      bullets: ["Konkretnie."],
    },
  ],
};

type Served = { list?: unknown; one?: unknown };

function serve({ list, one }: Served) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(fn) === "growth/advice:listAdvice" ? list : one,
  );
}

const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");

const renderAt = (path = "/porady") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AdvicePage />
    </MemoryRouter>,
  );

const lastListArgs = () => {
  const calls = mocks.useQuery.mock.calls.filter(
    ([fn]) =>
      getFunctionName(fn as Parameters<typeof getFunctionName>[0]) ===
      "growth/advice:listAdvice",
  );
  return calls[calls.length - 1]?.[1] as unknown;
};

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.useQuery.mockReset();
});

describe("AdvicePage list", () => {
  it("shows an offline notice and sets the page title", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderAt();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(document.title).toBe("Porady");
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("lists articles with topic, reading time and source", () => {
    online();
    serve({ list: [feedback, demo] });
    renderAt();
    expect(screen.getByText("Znaleziono: 2")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Informacja zwrotna" }),
    ).toHaveAttribute("href", "/porady?porada=informacja-zwrotna");
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Czas czytania: 2 min");
    expect(items[0]).toHaveTextContent(
      "Źródło: poradnik-oceny-okresowe.md, pkt 6.2.3",
    );
    expect(items[1]).toHaveTextContent("Dane demonstracyjne");
    expect(items[1]).not.toHaveTextContent("Źródło:");
  });

  it("says when there are no articles, and when a filter finds none", async () => {
    online();
    serve({ list: [] });
    renderAt();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nie ma jeszcze żadnych porad.",
    );
    await userEvent.selectOptions(screen.getByLabelText("Temat"), "dobrostan");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Brak porad dla wybranych filtrów.",
    );
  });

  it("waits while the list loads", () => {
    online();
    serve({ list: undefined });
    renderAt();
    expect(screen.getByText("Ładowanie porad…")).toBeInTheDocument();
  });

  it("has labelled filters reachable in order from the keyboard", async () => {
    online();
    serve({ list: [feedback] });
    renderAt();
    const labels = [
      "Temat",
      "Kryterium oceny",
      "Szukaj w tytule i streszczeniu",
    ];
    await userEvent.tab();
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toHaveFocus();
      await userEvent.tab();
    }
  });

  it("sends only the chosen filters and clears them", async () => {
    online();
    serve({ list: [feedback] });
    renderAt();
    expect(lastListArgs()).toEqual({});
    await userEvent.selectOptions(
      screen.getByLabelText("Temat"),
      "informacja_zwrotna",
    );
    expect(lastListArgs()).toEqual({ topic: "informacja_zwrotna" });
    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium oceny"),
      "komunikacja",
    );
    await userEvent.type(
      screen.getByLabelText("Szukaj w tytule i streszczeniu"),
      "zwrot",
    );
    expect(lastListArgs()).toEqual({
      topic: "informacja_zwrotna",
      criterionId: "komunikacja",
      search: "zwrot",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Wyczyść filtry" }),
    );
    expect(lastListArgs()).toEqual({});
    expect(screen.getByLabelText("Temat")).toHaveValue("");
  });

  it("keeps the filters when an article is opened and the user comes back", async () => {
    online();
    serve({ list: [feedback], one: full });
    renderAt();
    await userEvent.selectOptions(
      screen.getByLabelText("Temat"),
      "informacja_zwrotna",
    );
    await userEvent.click(
      screen.getByRole("link", { name: "Informacja zwrotna" }),
    );
    expect(screen.queryByLabelText("Temat")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("link", { name: "Wszystkie porady" }),
    );
    expect(screen.getByLabelText("Temat")).toHaveValue("informacja_zwrotna");
  });
});

describe("AdvicePage article", () => {
  it("renders every section: headings, paragraphs and bullets", () => {
    online();
    serve({ one: full });
    renderAt("/porady?porada=informacja-zwrotna");
    expect(
      screen.getByRole("heading", { level: 2, name: "Informacja zwrotna" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(["Dwa rodzaje", "Jak przekazać"]);
    expect(screen.getByText("Pierwszy akapit.")).toBeInTheDocument();
    const bullets = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(bullets).toEqual(["Bieżąca.", "Cykliczna.", "Konkretnie."]);
    expect(
      screen.getByText(/Źródło: poradnik-oceny-okresowe/),
    ).toBeInTheDocument();
    expect(screen.getByText("Kryteria: Komunikacja")).toBeInTheDocument();
  });

  it("shows text as text and never as markup", () => {
    online();
    serve({ one: full });
    const { container } = renderAt("/porady?porada=informacja-zwrotna");
    expect(screen.getByText(/z <b>tagiem<\/b>/)).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
  });

  it("labels a demonstration article", () => {
    online();
    serve({ one: { ...full, source: "demo", sourceRef: undefined } });
    renderAt("/porady?porada=informacja-zwrotna");
    expect(screen.getByText("Dane demonstracyjne")).toBeInTheDocument();
    expect(screen.queryByText(/Źródło:/)).not.toBeInTheDocument();
  });

  it("offers a way back to the list", () => {
    online();
    serve({ one: full });
    renderAt("/porady?porada=informacja-zwrotna");
    expect(
      screen.getByRole("link", { name: "Wszystkie porady" }),
    ).toHaveAttribute("href", "/porady");
  });

  it("says so when the article is missing, and waits while it loads", () => {
    online();
    serve({ one: null });
    const { unmount } = renderAt("/porady?porada=nie-ma");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie znaleziono porady",
    );
    unmount();
    serve({ one: undefined });
    renderAt("/porady?porada=nie-ma");
    expect(screen.getByText("Ładowanie porady…")).toBeInTheDocument();
  });
});
