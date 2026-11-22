import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
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

function renderPage() {
  return render(
    <MemoryRouter>
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
    expect(screen.getByText(/4 min czytania/)).toBeInTheDocument();
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
    expect(screen.getByText(/Dane demonstracyjne: widok/)).toBeInTheDocument();
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
    expect(screen.getByText(/Dane demonstracyjne: widok/)).toBeInTheDocument();
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
