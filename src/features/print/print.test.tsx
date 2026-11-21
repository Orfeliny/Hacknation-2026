import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewExportSchema } from "./exportSchema";
import { fixtureSheet } from "./fixtures";
import { PrintPage } from "./PrintPage";
import { PRINT_CSS } from "./printStyles";
import { buildSheetModel, type PrintableSheet } from "./sheetModel";
import { SheetView } from "./SheetView";

const useQueryMock = vi.hoisted(() => vi.fn());
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: useQueryMock,
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));

const view = (sheet: PrintableSheet) =>
  render(<SheetView model={buildSheetModel(sheet)} />);

function renderPage(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PrintPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  useQueryMock.mockReset();
});

describe("SheetView", () => {
  it("prints sheet A with six mandatory criteria and without the unit", () => {
    view(fixtureSheet("A"));
    expect(
      screen.getByRole("article", { name: "Arkusz A" }),
    ).toBeInTheDocument();
    const matrix = screen.getByRole("table", {
      name: "Oceny cząstkowe kryteriów",
    });
    expect(
      within(matrix).getAllByText("Zarządzanie strategiczne"),
    ).toHaveLength(1);
    expect(screen.queryByText("Komórka organizacyjna")).not.toBeInTheDocument();
    expect(screen.getByText(/sprzeciw do/)).toHaveTextContent(
      "sprzeciw do: Prezesa Rady Ministrów",
    );
  });

  it.each(["B", "C"] as const)(
    "prints sheet %s with the unit and the fixed objection addressee",
    (sheet) => {
      view(fixtureSheet(sheet));
      expect(
        screen.getAllByText("Komórka organizacyjna").length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(/sprzeciw do/)).toHaveTextContent(
        "sprzeciw do dyrektora generalnego urzędu.",
      );
      expect(
        screen.queryByText("Zarządzanie strategiczne"),
      ).not.toBeInTheDocument();
    },
  );

  it("fills part I: office, people, criteria, due date and both signatures", () => {
    view(fixtureSheet("C"));
    expect(screen.getByText("Urząd Analiz Strategicznych")).toBeInTheDocument();
    expect(screen.getAllByText("Rokicińska").length).toBeGreaterThan(0);
    expect(screen.getByText("01.12.2026")).toBeInTheDocument();
    expect(screen.getAllByText("02.12.2024").length).toBeGreaterThan(0);
    expect(screen.getByText("03.12.2024")).toBeInTheDocument();
    expect(screen.getAllByText("podpis ocenianego").length).toBeGreaterThan(0);
  });

  it("marks one cell per criterion in the rating matrix", () => {
    view(fixtureSheet("C"));
    const matrix = screen.getByRole("table", {
      name: "Oceny cząstkowe kryteriów",
    });
    const row = within(matrix).getByRole("row", {
      name: /Wykorzystywanie wiedzy/,
    });
    const cells = within(row).getAllByRole("cell");
    expect(cells).toHaveLength(5);
    expect(cells[3]).toHaveTextContent("X");
    expect(within(row).getAllByLabelText("zaznaczone")).toHaveLength(1);
    expect(
      within(matrix).getByRole("row", { name: /Kreatywność/ }),
    ).toBeInTheDocument();
  });

  it("marks the overall level, the result and the average", () => {
    view(fixtureSheet("C"));
    const levels = screen.getByRole("table", {
      name: "Ogólny poziom spełnienia kryteriów",
    });
    const selected = within(levels).getByRole("row", {
      name: /na poziomie oczekiwań/,
    });
    expect(within(selected).getByLabelText("zaznaczone")).toBeInTheDocument();
    expect(within(levels).getAllByLabelText("zaznaczone")).toHaveLength(1);
    const positive = screen.getByText("POZYTYWNA").closest("span");
    expect(within(positive!).getByLabelText("zaznaczone")).toBeInTheDocument();
    const negative = screen.getByText("NEGATYWNA").closest("span");
    expect(
      within(negative!).queryByLabelText("zaznaczone"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("prints the justification, the development conclusions and per-criterion notes", () => {
    view(fixtureSheet("C"));
    expect(
      screen.getByText(/Rzetelne i terminowe wykonywanie zadań/),
    ).toBeInTheDocument();
    expect(screen.getByText("Proponuje nowe rozwiązania.")).toBeInTheDocument();
    expect(
      screen.getByText(/Rozwój umiejętności analitycznych/),
    ).toBeInTheDocument();
    expect(screen.getByText("Kurs wystąpień publicznych")).toBeInTheDocument();
  });

  it("shows the previous review and part III for an official with a request", () => {
    view(fixtureSheet("C"));
    expect(
      screen.getByText(/Dane dotyczące poprzedniej oceny okresowej/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "CZĘŚĆ III" }),
    ).toBeInTheDocument();
    expect(screen.getByText("czwartego")).toBeInTheDocument();
    expect(screen.getByText(/Stały, wysoki poziom pracy/)).toBeInTheDocument();
  });

  it("drops part III when no request was made, and the previous review for an employee", () => {
    const sheet = fixtureSheet("C");
    view({
      ...sheet,
      employee: { ...sheet.employee, isOfficial: false },
    });
    expect(
      screen.queryByRole("heading", { name: "CZĘŚĆ III" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Dane dotyczące poprzedniej oceny okresowej/),
    ).not.toBeInTheDocument();
  });

  it("leaves unfilled fields empty and marks nothing on a review that just started", () => {
    view(
      fixtureSheet("B", {
        stage: "setup",
        dueDate: null,
        ratings: [],
        additionalCriteria: [],
        averageScore: null,
        overallLevelId: null,
        overallResult: null,
        overallJustification: null,
        developmentPlan: null,
        previousReview: null,
        promotionRequest: null,
        signatures: [],
      }),
    );
    expect(screen.queryAllByLabelText("zaznaczone")).toHaveLength(1);
    expect(screen.getAllByText("brak").length).toBeGreaterThan(0);
  });

  it("notes a deemed acknowledgement", () => {
    const sheet = fixtureSheet("C");
    view({
      ...sheet,
      signatures: [
        {
          role: "employee",
          scope: "assessment",
          place: null,
          date: "2026-11-21",
          deemedAcknowledgement: true,
        },
      ],
    });
    expect(
      screen.getByText(/stwierdzone w systemie przez oceniającego/),
    ).toBeInTheDocument();
  });

  it("has no header element, so the print rule that hides the app header cannot hit it", () => {
    const { container } = view(fixtureSheet("A"));
    expect(container.querySelector("header")).toBeNull();
  });
});

describe("print styles", () => {
  it("sets an A4 page and hides the app chrome", () => {
    expect(PRINT_CSS).toContain("size: A4");
    expect(PRINT_CSS).toMatch(/@media print[\s\S]*header/);
    expect(PRINT_CSS).toMatch(/\[role="status"\]/);
  });
});

describe("PrintPage", () => {
  const online = () =>
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");

  it("shows an offline notice and does not crash without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage("/druk");
    expect(screen.getByText(/Wydruk wymaga połączenia/)).toBeInTheDocument();
    expect(useQueryMock).not.toHaveBeenCalled();
  });

  it("lists the reviews the role may print and links to the print view", () => {
    online();
    useQueryMock.mockReturnValue([
      {
        reviewId: "r1",
        stage: "signing",
        sheet: "C",
        round: 2,
        employeeName: "Anna Rokicińska",
      },
    ]);
    renderPage("/druk");
    const link = screen.getByRole("link", { name: "Anna Rokicińska" });
    expect(link).toHaveAttribute("href", "/druk?ocena=r1");
    expect(screen.getByText(/podejście 2/)).toBeInTheDocument();
  });

  it("says so when the role has no reviews", () => {
    online();
    useQueryMock.mockReturnValue([]);
    renderPage("/druk");
    expect(screen.getByText(/Brak ocen dostępnych/)).toBeInTheDocument();
  });

  it("renders the sheet of the chosen review with a toolbar that is hidden in print", () => {
    online();
    useQueryMock.mockReturnValue(fixtureSheet("B"));
    renderPage("/druk?ocena=abc");
    expect(
      screen.getByRole("article", { name: "Arkusz B" }),
    ).toBeInTheDocument();
    const toolbar = screen
      .getByRole("button", { name: /Drukuj/ })
      .closest("div");
    expect(toolbar).toHaveClass("print:hidden");
    expect(screen.getByRole("button", { name: "Pobierz JSON" })).toBeEnabled();
  });

  it("puts the sheet in a keyboard-focusable scroll region and sets the page title", () => {
    online();
    useQueryMock.mockReturnValue(fixtureSheet("B"));
    renderPage("/druk?ocena=abc");
    const region = screen.getByRole("region", { name: "Arkusz oceny" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(
      screen.getByRole("article", { name: "Arkusz B" }),
    );
    expect(document.title).toBe("Wydruk arkusza oceny");
  });

  it("waits while the query loads", () => {
    online();
    useQueryMock.mockReturnValue(undefined);
    renderPage("/druk?ocena=abc");
    expect(screen.getByText(/Ładowanie arkusza/)).toBeInTheDocument();
  });

  it("explains a review that has no sheet yet", () => {
    online();
    useQueryMock.mockReturnValue(fixtureSheet("C", { sheet: null }));
    renderPage("/druk?ocena=abc");
    expect(
      screen.getByText(/nie ma jeszcze wybranego arkusza/),
    ).toBeInTheDocument();
  });

  it("shows a message and a way back when the query is refused", () => {
    online();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useQueryMock.mockImplementation(() => {
      throw new Error("Not allowed to print this review");
    });
    renderPage("/druk?ocena=abc");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /nie ma do niej dostępu/,
    );
    expect(
      screen.getByRole("link", { name: "Wróć do listy ocen" }),
    ).toHaveAttribute("href", "/druk");
  });

  it("opens the browser print dialog", async () => {
    online();
    useQueryMock.mockReturnValue(fixtureSheet("C"));
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    renderPage("/druk?ocena=abc");
    await userEvent.click(screen.getByRole("button", { name: /Drukuj/ }));
    expect(print).toHaveBeenCalledOnce();
  });

  it("downloads JSON that the export schema accepts", async () => {
    online();
    useQueryMock.mockReturnValue(fixtureSheet("C"));
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((value: Blob) => {
      blob = value;
      return "blob:test";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("ocena-C-demo.json");
      });
    renderPage("/druk?ocena=abc");
    await userEvent.click(screen.getByRole("button", { name: "Pobierz JSON" }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    const parsed = reviewExportSchema.parse(JSON.parse(await blob!.text()));
    expect(parsed.sheet).toBe("C");
    expect(parsed.schemaVersion).toBe(1);
  });

  it("renders the development demo review for each sheet without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage("/druk?ocena=demo&arkusz=A");
    expect(
      screen.getByRole("article", { name: "Arkusz A" }),
    ).toBeInTheDocument();
  });
});
