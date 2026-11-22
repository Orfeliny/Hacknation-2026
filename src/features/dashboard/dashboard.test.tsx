import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deadlineShiftStore } from "../../lib/backend/demo/deadlineShift";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { RouteRegistryContext } from "../../app/routeRegistry";
import { DashboardPage } from "./DashboardPage";
import { procedureStats, splitRows, type DashboardRow } from "./model";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
}));

const stub = <T extends string>(id: T) => id as never;

function row(over: Partial<DashboardRow>): DashboardRow {
  return {
    reviewId: stub("r0"),
    employeeId: stub("e0"),
    employeeName: "Jan Test",
    position: "Specjalista",
    sheet: "C",
    stage: "writing",
    stageLabel: "Sporządzenie oceny",
    dueDate: "2027-01-31",
    daysLeft: 40,
    gapCount: 0,
    objectionDeadline: null,
    evaluatorSigned: false,
    shiftedFrom: null,
    ...over,
  };
}

const rows: DashboardRow[] = [
  row({
    reviewId: stub("r-anna"),
    employeeId: stub("e-anna"),
    employeeName: "Anna Kowalska",
    dueDate: "2027-02-10",
    daysLeft: 50,
    gapCount: 2,
  }),
  row({
    reviewId: stub("r-kasia"),
    employeeId: stub("e-kasia"),
    employeeName: "Katarzyna Nowak",
    stage: "opening",
    stageLabel: "Rozmowa rozpoczynająca",
    dueDate: "2027-01-05",
    daysLeft: 5,
  }),
  row({
    reviewId: stub("r-piotr"),
    employeeId: stub("e-piotr"),
    employeeName: "Piotr Spóźniony",
    dueDate: "2026-11-01",
    daysLeft: -3,
  }),
  row({
    reviewId: stub("r-tomek"),
    employeeId: stub("e-tomek"),
    employeeName: "Tomasz Lewandowski",
    stage: "objection_window",
    stageLabel: "Zapoznanie i sprzeciw",
    dueDate: "2026-12-01",
    daysLeft: 9,
    objectionDeadline: "2026-12-24",
  }),
];

const ROUTES = ["/rozmowy", "/oceny", "/przesuniecie-terminu"];

function mount(registered: string[] = ROUTES) {
  const element: ReactElement = <DashboardPage />;
  const router = createMemoryRouter(
    [
      { path: "/pulpit", element },
      ...registered.map((path) => ({ path, element: <p>{path}</p> })),
      { path: "*", element: <p>404</p> },
    ],
    { initialEntries: ["/pulpit"] },
  );
  return render(
    <RouteRegistryContext.Provider value={registered}>
      <RouterProvider router={router} />
    </RouteRegistryContext.Provider>,
  );
}

const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
const section = (name: string) => screen.findByRole("region", { name });
const linkNames = () =>
  screen
    .getAllByRole("link")
    .concat(screen.queryAllByRole("button"))
    .map((el) => el.textContent?.trim());

beforeEach(() => {
  deadlineShiftStore.reset();
  mocks.useQuery.mockReturnValue(rows);
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  mocks.useQuery.mockReset();
});

describe("dashboard model", () => {
  it("splits rows into todo and waiting, each by its deadline", () => {
    const { todo, waiting } = splitRows(rows);
    expect(todo.map((r) => r.employeeName)).toEqual([
      "Piotr Spóźniony",
      "Katarzyna Nowak",
      "Anna Kowalska",
    ]);
    expect(waiting.map((r) => r.employeeName)).toEqual(["Tomasz Lewandowski"]);
  });

  it("counts overdue, soon and formal gaps", () => {
    expect(procedureStats(splitRows(rows).todo)).toEqual({
      overdue: 1,
      soon: 1,
      gaps: 2,
    });
  });
});

describe("DashboardPage online", () => {
  beforeEach(online);

  it("lists todo sorted by deadline with status text, and who we wait for", async () => {
    mount();
    const todo = within(await section("Do zrobienia"));
    const items = todo
      .getAllByRole("listitem")
      .filter((li) => li.closest("ol"));
    const text = items.map((li) => li.textContent ?? "");
    const order = ["Piotr Spóźniony", "Katarzyna Nowak", "Anna Kowalska"].map(
      (name) => text.findIndex((t) => t.includes(name)),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(todo.getByText(/3 dni po terminie/)).toBeInTheDocument();
    expect(todo.getByText(/za 5 dni/)).toBeInTheDocument();
    expect(todo.getByText("2 braki formalne")).toBeInTheDocument();
    const waiting = within(await section("Czekasz na innych"));
    expect(waiting.getAllByText("Tomasz Lewandowski").length).toBeGreaterThan(
      0,
    );
    expect(waiting.getByText(/24\.12\.2026/)).toBeInTheDocument();
  });

  it("opens the read-only preview of the waiting review", async () => {
    mount();
    const link = within(await section("Czekasz na innych")).getByRole("link", {
      name: "Podgląd oceny: Tomasz Lewandowski",
    });
    expect(link).toHaveAttribute("href", "/oceny?ocena=r-tomek&tryb=podglad");
  });

  it("links the opening conversation to the same person", async () => {
    mount();
    const link = await screen.findByRole("link", {
      name: "Przygotuj rozmowę: Katarzyna Nowak",
    });
    expect(link).toHaveAttribute(
      "href",
      "/rozmowy?pracownik=e-kasia&rodzaj=rozpoczynajaca",
    );
  });

  it("puts a requested deadline shift into todo and links to the entry", async () => {
    mount();
    const link = await screen.findByRole("link", {
      name: /^Rozstrzygnij wniosek: Joanna Mazur/,
    });
    expect(link.getAttribute("href")).toMatch(
      /^\/przesuniecie-terminu\?ocena=demo:reviews:mazur&zmiana=0$/,
    );
    expect(
      within(await section("Do zrobienia")).getByText(
        /Wniosek o przesunięcie terminu · Joanna Mazur · Decyzja należy do Ciebie/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dane demonstracyjne/)).toBeInTheDocument();
  });

  it("leaves out links to screens that are not registered", async () => {
    mount(["/oceny"]);
    await screen.findAllByText(/Decyzja należy do Ciebie/);
    expect(
      screen.queryByRole("link", { name: /Rozstrzygnij wniosek/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Przygotuj rozmowę/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kontynuuj ocenę: Anna Kowalska" }),
    ).toBeInTheDocument();
  });

  it("gives every link and button on the page a unique name", async () => {
    mount();
    await screen.findAllByText(/Decyzja należy do Ciebie/);
    const names = screen
      .getAllByRole("link")
      .map((el) => el.textContent?.trim());
    expect(new Set(names).size).toBe(names.length);
    expect(linkNames().length).toBeGreaterThan(0);
  });

  it("filters the team table to the todo rows", async () => {
    mount();
    await screen.findAllByText(/Decyzja należy do Ciebie/);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    await userEvent.click(
      screen.getByRole("button", { name: /Twoje działania/ }),
    );
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).queryByText("Tomasz Lewandowski")).toBeNull();
  });

  it("shows a loading state until the query answers", () => {
    mocks.useQuery.mockReturnValue(undefined);
    mount();
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie");
  });

  it("asks other roles to switch to the supervisor role", () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "hr");
    mount();
    expect(screen.getByText(/Pulpit jest dla roli/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });
});

describe("DashboardPage offline", () => {
  beforeEach(() => vi.stubEnv("VITE_CONVEX_URL", ""));

  it("renders an offline state with the demo deadline shifts, no query", async () => {
    mount();
    expect(
      await screen.findByText(/Oceny wymagają połączenia z backendem/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/Dane demonstracyjne/)).toBeInTheDocument(),
    );
    expect(mocks.useQuery).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("region", { name: "Czekasz na innych" }),
    ).not.toBeInTheDocument();
  });
});
