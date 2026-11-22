import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdvicePage } from "./AdvicePage";
import pageSource from "./AdvicePage.tsx?raw";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
}));

type Item = {
  slug: string;
  title: string;
  summary: string;
  topic: string;
  readingMinutes?: number;
  sourceRef?: string;
  isDemo: boolean;
};

const items: Item[] = [
  {
    slug: "feedback",
    title: "Jak dawać informację zwrotną",
    summary: "Krótko o rozmowie z pracownikiem.",
    topic: "informacja_zwrotna",
    readingMinutes: 4,
    isDemo: true,
  },
  {
    slug: "rozmowa",
    title: "Rozmowa oceniająca krok po kroku",
    summary: "Jak przygotować i poprowadzić rozmowę.",
    topic: "rozmowa_oceniajaca",
    readingMinutes: 6,
    sourceRef: "Poradnik oceny okresowej, rozdz. 5",
    isDemo: false,
  },
];

const article = {
  ...items[0]!,
  sections: [
    {
      heading: "Zacznij od faktów",
      paragraphs: ["Opisz zachowanie <i>bez</i> oceniania osoby."],
      bullets: ["Podaj przykład", "Zapytaj o perspektywę pracownika"],
    },
    {
      heading: "Ustal kolejny krok",
      paragraphs: ["Wspólnie zaplanuj działanie."],
      bullets: [],
    },
  ],
};

function serve(detail: unknown = article) {
  mocks.useQuery.mockImplementation(
    (
      fn: Parameters<typeof getFunctionName>[0],
      args: { topic?: string; search?: string },
    ) => {
      if (getFunctionName(fn) === "growth/advice:listAdvice") {
        const q = (args.search ?? "").toLowerCase();
        return items.filter(
          (i) =>
            (!args.topic || i.topic === args.topic) &&
            (!q || `${i.title} ${i.summary}`.toLowerCase().includes(q)),
        );
      }
      return detail;
    },
  );
}

const renderAt = (path = "/porady") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AdvicePage />
    </MemoryRouter>,
  );

beforeEach(() => vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud"));
afterEach(() => {
  vi.unstubAllEnvs();
  mocks.useQuery.mockReset();
});

describe("advice list", () => {
  it("shows an offline notice without calling the backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderAt();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("has a single h1 and lists every article with its source or the demo label", () => {
    serve();
    renderAt();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: /Jak dawać|Rozmowa oceniająca/ }),
    ).toHaveLength(2);
    expect(screen.getByText("Źródło: Dane demonstracyjne")).toBeInTheDocument();
    expect(
      screen.getByText("Źródło: Poradnik oceny okresowej, rozdz. 5"),
    ).toBeInTheDocument();
  });

  it("asks only for the articles written for supervisors", () => {
    serve();
    renderAt();
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ audience: "przelozony" }),
    );
  });

  it("narrows the list by topic and by text", async () => {
    serve();
    renderAt();
    await userEvent.selectOptions(
      screen.getByLabelText("Temat"),
      "rozmowa_oceniajaca",
    );
    expect(
      screen.getAllByRole("link", { name: /Rozmowa oceniająca|Jak dawać/ }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: /Rozmowa oceniająca/ }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Temat"), "");
    await userEvent.type(
      screen.getByLabelText("Szukaj w tytułach i opisach"),
      "informację",
    );
    expect(screen.getByRole("link", { name: /Jak dawać/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Rozmowa oceniająca/ }),
    ).toBeNull();
  });

  it("shows an empty state with and without filters", async () => {
    mocks.useQuery.mockReturnValue([]);
    renderAt();
    expect(
      screen.getByText("Nie ma jeszcze żadnych porad."),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("Szukaj w tytułach i opisach"),
      "x",
    );
    expect(
      screen.getByText("Brak porad dla wybranych filtrów."),
    ).toBeInTheDocument();
  });

  it("does not crash when the list query fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useQuery.mockImplementation(() => {
      throw new Error("boom");
    });
    renderAt();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się wczytać porad",
    );
    spy.mockRestore();
  });
});

describe("advice article", () => {
  it("renders all sections as text, with headings, paragraphs and bullets", () => {
    serve();
    renderAt("/porady?porada=feedback");
    expect(
      screen.getByRole("heading", { name: "Jak dawać informację zwrotną" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Zacznij od faktów" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ustal kolejny krok" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Podaj przykład")).toBeInTheDocument();
    expect(screen.getByText(/bez<\/i> oceniania/)).toBeInTheDocument();
    expect(document.querySelector("i")).toBeNull();
    expect(screen.getByText("Źródło: Dane demonstracyjne")).toBeInTheDocument();
  });

  it("does not use dangerouslySetInnerHTML", () => {
    expect(pageSource).not.toContain("dangerouslySetInnerHTML");
  });

  it("shows a message and a link back for an unknown slug", () => {
    serve(null);
    renderAt("/porady?porada=nie-ma");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie znaleziono porady",
    );
    expect(
      screen.getByRole("link", { name: "Wróć do listy porad" }),
    ).toHaveAttribute("href", "/porady");
  });

  it("does not crash when the article query throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useQuery.mockImplementation(() => {
      throw new Error("bad slug");
    });
    renderAt("/porady?porada=zly");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie znaleziono porady",
    );
    spy.mockRestore();
  });
});
