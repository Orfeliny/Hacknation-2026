import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ADVICE_TOPIC_LABELS } from "../../../convex/growth/constants";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adviceHooks from "../../lib/backend/advice";
import { adviceStore } from "../../lib/backend/demo/advice";
import { setDemoRole } from "../../lib/demoRole";
import { AdvicePage } from "./AdvicePage";
import pageSource from "./AdvicePage.tsx?raw";
import articleBodySource from "./ArticleBody.tsx?raw";
import articleCardSource from "./ArticleCard.tsx?raw";

const mocks = vi.hoisted(() => ({ convexQuery: vi.fn() }));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.convexQuery,
}));

vi.mock("../../lib/backend/advice", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/backend/advice")>();
  return {
    ...actual,
    useAdviceList: vi.fn(actual.useAdviceList),
    useAdvice: vi.fn(actual.useAdvice),
  };
});

const realHooks = await vi.importActual<
  typeof import("../../lib/backend/advice")
>("../../lib/backend/advice");
const listHook = vi.mocked(adviceHooks.useAdviceList);
const articleHook = vi.mocked(adviceHooks.useAdvice);

beforeEach(() => {
  listHook.mockImplementation(realHooks.useAdviceList);
  articleHook.mockImplementation(realHooks.useAdvice);
});

function renderPage(initialEntry = "/porady") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AdvicePage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  adviceStore.reset();
  mocks.convexQuery.mockReset();
  setDemoRole("supervisor");
});

const OPEN_FIRST = "Czytaj dalej: Informacja zwrotna w trzech krokach";

describe("AdvicePage", () => {
  it("shows a loading state, then the article list with reading time", async () => {
    renderPage();
    expect(screen.getByText("Wczytuję porady…")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Informacja zwrotna w trzech krokach",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/· 4 min$/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
  });

  it("shows the source, or the demo label when there is none", async () => {
    renderPage();
    const withSource = (
      await screen.findByRole("heading", {
        name: "Informacja zwrotna w trzech krokach",
      })
    ).closest("li") as HTMLElement;
    expect(
      within(withSource).getByText(/Źródło: docs\/materialy_md/),
    ).toBeInTheDocument();
    const withoutSource = screen
      .getByRole("heading", { name: "Obciążenie i dobrostan zespołu" })
      .closest("li") as HTMLElement;
    expect(
      within(withoutSource).getByText("Dane demonstracyjne"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Dane demonstracyjne: widok/)).toBeNull();
  });

  it("filters by topic and marks the pressed button", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    const button = screen.getByRole("button", { name: "Docenianie" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByRole("heading", {
        name: "Docenianie codziennej pracy",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kryteria oceny w praktyce" }),
    ).not.toBeInTheDocument();
  });

  it("searches ignoring diacritics and shows an empty state", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    const box = screen.getByRole("searchbox", { name: "Szukaj w poradach" });
    await user.type(box, "obciazenie");
    expect(
      await screen.findByRole("heading", {
        name: "Obciążenie i dobrostan zespołu",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Docenianie codziennej pracy" }),
    ).not.toBeInTheDocument();
    await user.clear(box);
    await user.type(box, "zzzzzz");
    expect(
      await screen.findByText("Brak porad dla wybranego tematu i frazy."),
    ).toBeInTheDocument();
  });

  it("expands one article and renders sections as plain text", async () => {
    const user = userEvent.setup();
    adviceStore.set(
      adviceStore.get().map((a, i) =>
        i === 0
          ? {
              ...a,
              sections: [
                {
                  heading: "Sekcja",
                  paragraphs: ["<b>nie pogrubiaj</b>"],
                  bullets: ["punkt A"],
                },
              ],
            }
          : a,
      ),
    );
    renderPage();
    const toggle = await screen.findByRole("button", {
      name: "Czytaj dalej: Informacja zwrotna w trzech krokach",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      await screen.findByRole("heading", { name: "Sekcja", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText("<b>nie pogrubiaj</b>")).toBeInTheDocument();
    expect(screen.getByText("punkt A")).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });

  it("gives every button a unique accessible name", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    const names = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "");
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("AdvicePage, cases ported from #100", () => {
  it("runs on demo data offline without calling the backend", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    expect(mocks.convexQuery).not.toHaveBeenCalled();
  });

  it("has a single h1 and lists every article with its source or the demo label", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(cards.length).toBeGreaterThan(1);
    for (const card of cards) {
      expect(
        within(card).getAllByText(/Źródło: |Dane demonstracyjne/).length,
      ).toBeGreaterThan(0);
    }
  });

  it("asks only for the articles written for the viewer's role", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    expect(listHook).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "przelozony" }),
    );
    setDemoRole("employee");
    listHook.mockClear();
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    expect(listHook).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "pracownik" }),
    );
  });

  it("narrows the list by topic and then by text", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    await user.click(screen.getByRole("button", { name: "Docenianie" }));
    expect(
      await screen.findByRole("heading", {
        name: "Docenianie codziennej pracy",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wszystkie" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Szukaj w poradach" }),
      "obciazenie",
    );
    expect(
      await screen.findByRole("heading", {
        name: "Obciążenie i dobrostan zespołu",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Docenianie codziennej pracy" }),
    ).toBeNull();
  });

  it("shows an empty state with and without filters", async () => {
    const user = userEvent.setup();
    listHook.mockReturnValue({ data: [], isDemo: false, offline: false });
    renderPage();
    expect(
      screen.getByText("Nie ma jeszcze żadnych porad."),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("searchbox", { name: "Szukaj w poradach" }),
      "x",
    );
    expect(
      await screen.findByText("Brak porad dla wybranego tematu i frazy."),
    ).toBeInTheDocument();
  });

  it("does not crash when the list query fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    listHook.mockImplementation(() => {
      throw new Error("boom");
    });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się wczytać porad",
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders all sections as text, with headings, paragraphs and bullets", async () => {
    const user = userEvent.setup();
    adviceStore.set(
      adviceStore.get().map((a, i) =>
        i === 0
          ? {
              ...a,
              sections: [
                {
                  heading: "Zacznij od faktów",
                  paragraphs: ["Opisz zachowanie <i>bez</i> oceniania."],
                  bullets: ["Podaj przykład", "Zapytaj o perspektywę"],
                },
                {
                  heading: "Ustal kolejny krok",
                  paragraphs: ["Wspólnie zaplanuj działanie."],
                  bullets: [],
                },
              ],
            }
          : a,
      ),
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: OPEN_FIRST }));
    expect(
      await screen.findByRole("heading", { name: "Zacznij od faktów" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ustal kolejny krok" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Podaj przykład")).toBeInTheDocument();
    expect(screen.getByText(/<i>bez<\/i> oceniania/)).toBeInTheDocument();
    expect(document.querySelector("i")).toBeNull();
  });

  it("does not use dangerouslySetInnerHTML", () => {
    for (const source of [pageSource, articleCardSource, articleBodySource]) {
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("shows a message and a link back when the article is gone", async () => {
    const user = userEvent.setup();
    articleHook.mockReturnValue({ data: null, isDemo: false, offline: false });
    renderPage();
    await user.click(await screen.findByRole("button", { name: OPEN_FIRST }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie znaleziono porady",
    );
    expect(
      screen.getByRole("link", { name: "Wróć do listy porad" }),
    ).toHaveAttribute("href", "/porady");
  });

  it("does not crash when the article query throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    articleHook.mockImplementation(() => {
      throw new Error("bad slug");
    });
    renderPage();
    await user.click(await screen.findByRole("button", { name: OPEN_FIRST }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie znaleziono porady",
    );
    expect(
      screen.getByRole("heading", { name: /Docenianie/ }),
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("AdvicePage, view audit (#168)", () => {
  it("titles the page per role and sets the document title", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Porady dla przełożonych",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe("Porady dla przełożonych — Azymut"),
    );
    setDemoRole("employee");
    renderPage();
    expect(
      screen.getAllByRole("heading", { level: 1, name: "Porady" }).length,
    ).toBeGreaterThan(0);
  });

  it("uses the prototype group label and short criteria chip", async () => {
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    const group = screen.getByRole("group", { name: "Etap oceny" });
    expect(
      within(group).getByRole("button", { name: "Kryteria" }),
    ).toBeInTheDocument();
    expect(ADVICE_TOPIC_LABELS.kryteria_oceny).toBe("Kryteria");
  });

  it("shows the demo label once per card, with no page-level note", async () => {
    renderPage();
    const card = (
      await screen.findByRole("heading", {
        name: "Obciążenie i dobrostan zespołu",
      })
    ).closest("li") as HTMLElement;
    expect(within(card).getAllByText("Dane demonstracyjne")).toHaveLength(1);
    expect(screen.queryByText(/Dane demonstracyjne: widok/)).toBeNull();
  });

  it("pins the toggle to the card bottom and drops items-start", async () => {
    renderPage();
    const toggle = await screen.findByRole("button", { name: OPEN_FIRST });
    expect(toggle.parentElement).toHaveClass("mt-auto");
    expect(screen.getAllByRole("list")[0]).not.toHaveClass("items-start");
  });

  it("announces the result count with a plural form", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    const count = adviceStore.get().length;
    expect(screen.getByRole("status")).toHaveTextContent(
      new RegExp(`^Znaleziono ${count} `),
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Szukaj w poradach" }),
      "obciazenie",
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Znaleziono 1 poradę",
      ),
    );
  });

  it("links to the review sheet from the sources section", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Skąd te teksty" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "arkuszu oceny" })).toHaveAttribute(
      "href",
      "/oceny",
    );
  });

  it("opens the article from ?porada=<slug>", async () => {
    const slug = adviceStore.get()[0]!.slug;
    renderPage(`/porady?porada=${slug}`);
    const toggle = await screen.findByRole("button", {
      name: "Zwiń: Informacja zwrotna w trzech krokach",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText(/Nie znaleziono porady z tego linku/)).toBeNull();
  });

  it("shows a friendly note and the full list for an unknown ?porada", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderPage("/porady?porada=abc");
    expect(
      await screen.findByText(/Nie znaleziono porady z tego linku/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: OPEN_FIRST })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
