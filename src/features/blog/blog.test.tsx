import { render, screen, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { BlogPage } from "./BlogPage";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useAction: () => vi.fn(),
}));

const advice = (n: number, isDemo = true) => ({
  slug: `porada-${n}`,
  title: `Porada ${n}`,
  summary: `Opis ${n}`,
  topic: "informacja_zwrotna",
  isDemo,
});
const thread = (n: number) => ({
  threadId: `t${n}`,
  kind: "question",
  title: `Wątek ${n}`,
  excerpt: "",
  authorName: "Anna Przykładowa",
  authorUnit: "",
  createdAt: n,
  replyCount: n,
  reported: false,
});
const suggestion = {
  option: {
    _id: "o1",
    _creationTime: 1,
    title: "Szkolenie z komunikacji",
    description: "Opis szkolenia.",
    form: "szkolenie",
    criterionIds: ["komunikacja"],
    level: "podstawowy",
    cost: "brak_danych",
    source: "demo",
    active: true,
  },
  matchedCriterionIds: ["komunikacja"],
  reason: "Pasuje do kryterium: Komunikacja",
};

type Data = {
  options?: unknown[];
  advice?: unknown[];
  threads?: unknown[];
  reviews?: unknown[];
  detail?: unknown;
  suggestions?: unknown[];
};

function serve(data: Data) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0], args: unknown) => {
      if (args === "skip") return undefined;
      switch (getFunctionName(fn)) {
        case "growth/options:listOptions":
          return data.options ?? [];
        case "growth/advice:listAdvice":
          return data.advice ?? [];
        case "forum/queries:listThreads":
          return data.threads ?? [];
        case "me/queries:list":
          return data.reviews ?? [];
        case "me/queries:get":
          return data.detail;
        case "growth/suggest:suggestForArea":
          return data.suggestions ?? [];
        default:
          return undefined;
      }
    },
  );
}

const calls = (name: string) =>
  mocks.useQuery.mock.calls.filter(
    ([fn]) =>
      getFunctionName(fn as Parameters<typeof getFunctionName>[0]) === name,
  );

const renderPage = () =>
  render(
    <MemoryRouter>
      <BlogPage />
    </MemoryRouter>,
  );

const closedReview = { _id: "r1", stage: "closed", createdAt: 2 };
const withAreas = (areas: unknown[]) => ({
  assessment: { developmentPlan: { areas } },
});

beforeEach(() => vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud"));
afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
  mocks.useQuery.mockReset();
});

describe("development blog", () => {
  it("shows an offline notice without calling the backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("shows the three entry points with counts and the newest items", () => {
    serve({
      options: [1, 2, 3, 4],
      advice: [1, 2, 3, 4].map((n) => advice(n)),
      threads: [4, 3, 2, 1].map(thread),
    });
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Katalog rozwoju: 4 pozycji" }),
    ).toHaveAttribute("href", "/rozwoj");
    expect(
      screen.getByRole("link", { name: "Porady: 4 porad" }),
    ).toHaveAttribute("href", "/porady");
    expect(
      screen.getByRole("link", { name: "Forum rozwoju: 4 wątków" }),
    ).toHaveAttribute("href", "/forum");
    const newest = within(
      screen.getByRole("heading", { name: "Najnowsze" }).closest("section")!,
    );
    expect(newest.getAllByRole("link")).toHaveLength(6);
    expect(newest.getByText("Wątek 4")).toBeInTheDocument();
    expect(newest.queryByText("Wątek 1")).toBeNull();
    expect(newest.queryByText("Porada 4")).toBeNull();
    expect(newest.getAllByText(/Dane demonstracyjne/)).toHaveLength(3);
  });

  it("does not mark an advice entry that is not demo data", () => {
    serve({ advice: [advice(1, false)] });
    renderPage();
    expect(screen.queryByText(/Dane demonstracyjne/)).toBeNull();
  });

  it("copes with empty data", () => {
    serve({});
    renderPage();
    expect(
      screen.getByRole("link", { name: "Katalog rozwoju: 0 pozycji" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nie ma jeszcze żadnych wątków."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nie ma jeszcze żadnych porad."),
    ).toBeInTheDocument();
  });

  it("does not crash when a query fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useQuery.mockImplementation(() => {
      throw new Error("boom");
    });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nie udało się wczytać",
    );
    spy.mockRestore();
  });
});

describe("areas of the employee", () => {
  beforeEach(() =>
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "employee"),
  );

  it("suggests catalog entries for the criteria of the latest visible review, with the reason", () => {
    serve({
      reviews: [{ _id: "r2", stage: "writing", createdAt: 3 }, closedReview],
      detail: withAreas([
        { id: "a1", criterionId: "komunikacja", text: "x" },
        { id: "a2", criterionId: "komunikacja", text: "y" },
        { id: "a3", text: "bez kryterium" },
        { id: "a4", criterionId: "nie-ma-takiego", text: "z" },
      ]),
      suggestions: [suggestion],
    });
    renderPage();
    expect(screen.getByText("Szkolenie z komunikacji")).toBeInTheDocument();
    expect(
      screen.getByText(/Pasuje do kryterium: Komunikacja/),
    ).toBeInTheDocument();
    expect(calls("me/queries:get").at(-1)?.[1]).toMatchObject({
      reviewId: "r1",
    });
    expect(calls("growth/suggest:suggestForArea").at(-1)?.[1]).toEqual({
      criterionIds: ["komunikacja"],
    });
  });

  it("shows a message and a link to the catalog without a review", () => {
    serve({ reviews: [] });
    renderPage();
    expect(
      screen.getByText(/Nie masz jeszcze oceny z planem rozwoju/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Przejdź do pełnego katalogu rozwoju" }),
    ).toHaveAttribute("href", "/rozwoj");
    expect(calls("growth/suggest:suggestForArea")).toHaveLength(0);
  });

  it("shows a message when the plan names no area with a criterion", () => {
    serve({
      reviews: [closedReview],
      detail: withAreas([{ id: "a1", text: "bez kryterium" }]),
    });
    renderPage();
    expect(
      screen.getByText(/nie wskazano jeszcze obszarów/),
    ).toBeInTheDocument();
    expect(calls("growth/suggest:suggestForArea")).toHaveLength(0);
  });

  it("falls back to a message when the personal queries fail", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useQuery.mockImplementation(
      (fn: Parameters<typeof getFunctionName>[0]) => {
        if (getFunctionName(fn).startsWith("me/")) throw new Error("nope");
        return [];
      },
    );
    renderPage();
    expect(
      screen.getByText(/Nie udało się wczytać Twoich obszarów/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Najnowsze" }),
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("other roles", () => {
  it.each(["supervisor", "hr", "director", "admin"])(
    "shows %s the page without the personal queries",
    (role) => {
      window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
      serve({ options: [1], advice: [advice(1)], threads: [thread(1)] });
      renderPage();
      expect(screen.getByText(/zalogowanemu pracownikowi/)).toBeInTheDocument();
      expect(calls("me/queries:list")).toHaveLength(0);
      expect(calls("me/queries:get")).toHaveLength(0);
    },
  );
});
