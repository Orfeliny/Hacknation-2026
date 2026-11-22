import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { ObservationsPage } from "./ObservationsPage";
import { whoSees } from "./labels";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  mutations: new Map<string, ReturnType<typeof vi.fn>>(),
}));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useMutation: (fn: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(fn);
    if (!mocks.mutations.has(name)) {
      mocks.mutations.set(name, vi.fn().mockResolvedValue(undefined));
    }
    return mocks.mutations.get(name);
  },
}));

const anna = { _id: "e1", firstName: "Anna", lastName: "Przykładowa" };
const jan = { _id: "e2", firstName: "Jan", lastName: "Nowak" };

const entry = (extra: object = {}) => ({
  _id: "o1",
  employeeId: "e1",
  authorId: "boss",
  date: "2026-05-12",
  text: "Zadanie w tydzień zamiast dwóch miesięcy.",
  sentiment: "positive",
  criterionId: "komunikacja",
  createdAt: 1,
  mine: true,
  authorName: "Katarzyna Wiśniewska",
  sharedWithName: null,
  ...extra,
});

const coverage = {
  reviewId: "r1",
  since: "2025-01-01",
  until: "2026-12-31",
  criteria: [
    { id: "rzetelnosc", name: "Rzetelność", kind: "mandatory", count: 2 },
    { id: "komunikacja", name: "Komunikacja", kind: "mandatory", count: 0 },
  ],
  missing: ["Komunikacja"],
};

function serve(data: Record<string, unknown>) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0], args: unknown) =>
      args === "skip" ? undefined : data[getFunctionName(fn)],
  );
}

const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
const asRole = (role: string) =>
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);

const renderPage = (initial = "/obserwacje") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <ObservationsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  mocks.mutations.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  mocks.useQuery.mockReset();
});

describe("ObservationsPage", () => {
  it("shows an offline state and queries nothing without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Dziennik obserwacji" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/tryb offline/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("asks roles other than supervisor and hr to switch", () => {
    online();
    asRole("employee");
    renderPage();
    expect(screen.getByText(/prowadzi przełożony/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("shows the timeline, the visibility rule and the coverage per criterion", () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna, jan],
      "observations/queries:timeline": [
        entry(),
        entry({
          _id: "o2",
          date: "2026-03-02",
          text: "Spóźniona notatka.",
          sentiment: "development",
          sharedWithName: "Ewa Kowalczyk",
        }),
      ],
      "observations/queries:coverage": coverage,
    });
    renderPage();

    expect(
      screen.getByText(
        /Anna Przykładowa · okres oceny 01\.01\.2025–31\.12\.2026 · 2 wpisów/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Wpisy widzisz Ty i kadry\. Anna Przykładowa nigdy/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Kto widzi ten wpis:/)).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    const first = items.find((li) => li.textContent?.includes("12.05.2026"))!;
    expect(within(first).getByText("Widzą: Ty i kadry")).toBeInTheDocument();
    expect(within(first).getByText("Pozytywna")).toBeInTheDocument();
    const second = items.find((li) => li.textContent?.includes("02.03.2026"))!;
    expect(
      within(second).getByText(
        "Widzą: Ty i kadry, Ewa Kowalczyk (za zgodą autora)",
      ),
    ).toBeInTheDocument();

    const aside = screen.getByRole("complementary", {
      name: "Pokrycie kryteriów",
    });
    expect(within(aside).getByText("0 wpisów")).toBeInTheDocument();
    expect(
      within(aside).getByText(/dodaj wpis o: Komunikacja/),
    ).toBeInTheDocument();
  });

  it("describes entries by someone else as seen through the author's consent", () => {
    expect(
      whoSees({
        mine: false,
        authorName: "Jan Poprzedni",
        sharedWithName: null,
      }),
    ).toBe("Widzą: Jan Poprzedni (autor), kadry i Ty (za zgodą autora)");
  });

  it("filters entries by criterion and by date", async () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [
        entry(),
        entry({
          _id: "o2",
          date: "2026-03-02",
          text: "Inna sprawa.",
          criterionId: "rzetelnosc",
        }),
      ],
      "observations/queries:coverage": null,
    });
    renderPage();
    const list = () => screen.getByRole("region", { name: "Wpisy" });
    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium (filtr)"),
      "rzetelnosc",
    );
    expect(
      within(list()).queryByText("Zadanie w tydzień zamiast dwóch miesięcy."),
    ).toBeNull();
    expect(within(list()).getByText("Inna sprawa.")).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium (filtr)"),
      "",
    );
    await userEvent.type(screen.getByLabelText("Od"), "2026-04-01");
    expect(within(list()).queryByText("Inna sprawa.")).toBeNull();
    expect(
      within(list()).getByText("Zadanie w tydzień zamiast dwóch miesięcy."),
    ).toBeInTheDocument();
  });

  it("adds an observation through the existing mutation and trims the text", async () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [],
      "observations/queries:coverage": null,
    });
    renderPage();
    expect(screen.getByText(/Nie ma jeszcze wpisów/)).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText("Co zaobserwowano?"),
      "  Dobra analiza.  ",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium"),
      "rzetelnosc",
    );
    await userEvent.click(screen.getByRole("radio", { name: "Do rozwoju" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz obserwację" }),
    );
    expect(
      mocks.mutations.get("observations/mutations:add"),
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { role: "supervisor" },
        employeeId: "e1",
        text: "Dobra analiza.",
        sentiment: "development",
        criterionId: "rzetelnosc",
      }),
    );
  });

  it("blocks an empty entry with a field error and does not call the backend", async () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [],
      "observations/queries:coverage": null,
    });
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz obserwację" }),
    );
    const field = screen.getByLabelText("Co zaobserwowano?");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/nie może być pusta/)).toBeInTheDocument();
    expect(
      mocks.mutations.get("observations/mutations:add"),
    ).not.toHaveBeenCalled();
  });

  it("shows a backend error and keeps the typed text", async () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [],
      "observations/queries:coverage": null,
    });
    mocks.mutations.set(
      "observations/mutations:add",
      vi.fn().mockRejectedValue(new Error("Nieznane kryterium: x.")),
    );
    renderPage();
    await userEvent.type(screen.getByLabelText("Co zaobserwowano?"), "Tekst");
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz obserwację" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nieznane kryterium: x.",
    );
    expect(screen.getByLabelText("Co zaobserwowano?")).toHaveValue("Tekst");
  });

  it("edits an own entry with update and removes it after confirmation", async () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [entry()],
      "observations/queries:coverage": null,
    });
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /^Edytuj wpis z 12\.05\.2026/ }),
    );
    const text = screen.getByLabelText("Co zaobserwowano?");
    expect(text).toHaveValue("Zadanie w tydzień zamiast dwóch miesięcy.");
    await userEvent.clear(text);
    await userEvent.type(text, "Poprawiony opis.");
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz zmiany we wpisie" }),
    );
    expect(
      mocks.mutations.get("observations/mutations:update"),
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        observationId: "o1",
        text: "Poprawiony opis.",
        criterionId: "komunikacja",
      }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /^Usuń wpis z 12\.05\.2026/ }),
    );
    expect(
      mocks.mutations.get("observations/mutations:remove"),
    ).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: /^Tak, usuń wpis z 12\.05\.2026/ }),
    );
    expect(
      mocks.mutations.get("observations/mutations:remove"),
    ).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      observationId: "o1",
    });
  });

  it("gives every row button a unique accessible name", () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [
        entry(),
        entry({ _id: "o2", date: "2026-03-02", text: "Inny wpis." }),
      ],
      "observations/queries:coverage": null,
    });
    renderPage();
    const names = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(new Set(names).size).toBe(names.length);
  });

  it("lets HR read the journal but not write to it, nor change someone else's entry", () => {
    online();
    asRole("hr");
    serve({
      "employees/queries:team": [anna],
      "observations/queries:timeline": [
        entry({ mine: false, authorName: "Katarzyna Wiśniewska" }),
      ],
      "observations/queries:coverage": coverage,
    });
    renderPage();
    expect(screen.getByText(/Kadry czytają dziennik/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Co zaobserwowano?")).toBeNull();
    expect(screen.queryByRole("button", { name: /Edytuj|Usuń/ })).toBeNull();
    expect(
      screen.getByText(
        "Widzą: Katarzyna Wiśniewska (autor), kadry i Ty (za zgodą autora)",
      ),
    ).toBeInTheDocument();
  });

  it("switches employee through the query string", async () => {
    online();
    asRole("supervisor");
    serve({
      "employees/queries:team": [anna, jan],
      "observations/queries:timeline": [],
      "observations/queries:coverage": null,
    });
    renderPage("/obserwacje?pracownik=e2");
    expect(screen.getByLabelText("Pracownik")).toHaveValue("e2");
    await userEvent.selectOptions(screen.getByLabelText("Pracownik"), "e1");
    expect(screen.getByLabelText("Pracownik")).toHaveValue("e1");
  });
});
