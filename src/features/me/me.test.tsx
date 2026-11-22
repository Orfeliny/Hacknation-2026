import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { MePage } from "./MePage";

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

type Data = Record<string, unknown>;

function serve(data: Data) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0]) => {
      return data[getFunctionName(fn)];
    },
  );
}

const summary = {
  _id: "r1",
  sheet: "C",
  stage: "signing",
  stageLabel: "Podpisy",
  periodStart: "2025-01-01",
  periodEnd: "2025-12-31",
  dueDate: "2026-02-01",
  createdAt: 1,
};

const detail = {
  ...summary,
  evaluatorName: "Jan Kowalski",
  expectations: [],
  assessment: {
    ratings: [{ criterionId: "rzetelnosc", levelId: "4" }],
    averageScore: 4,
    overallResult: "positive",
    overallLevelId: null,
    overallJustification: "Solidna praca",
    developmentPlan: {
      summary: "Szkolenie z komunikacji",
      actions: [{ text: "Kurs prezentacji" }],
    },
  },
};

const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
const asRole = (role: string) =>
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);

beforeEach(() => {
  mocks.mutations.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  mocks.useQuery.mockReset();
});

describe("MePage", () => {
  it("shows an open-on-a-computer message below 1024 px and hides the content", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(<MePage />);
    expect(screen.getByRole("status")).toHaveClass("lg:hidden");
    expect(screen.getByRole("status")).toHaveTextContent(/komputerze/);
    expect(screen.getByText(/wymaga połączenia/).parentElement).toHaveClass(
      "hidden",
      "lg:block",
    );
  });

  it("does not query anything without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(<MePage />);
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("asks other roles to switch to the employee role", () => {
    online();
    asRole("supervisor");
    render(<MePage />);
    expect(screen.getByText(/dla roli „oceniany”/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("does not show the assessment or a result link before the signing stage", () => {
    online();
    asRole("employee");
    serve({
      "me/queries:list": [{ ...summary, stage: "writing" }],
      "me/queries:get": { ...detail, stage: "writing", assessment: null },
      "me/queries:selfNotes": [],
      "reviews/queries:get": null,
    });
    render(<MePage />);
    expect(screen.getByText("Oceniający sporządza ocenę")).toBeInTheDocument();
    expect(screen.queryByText("Solidna praca")).not.toBeInTheDocument();
    expect(screen.queryByText("Zobacz wynik oceny")).not.toBeInTheDocument();
  });

  it("shows the stage timeline and signs part one through the reviews mutation", async () => {
    online();
    asRole("employee");
    serve({
      "me/queries:list": [{ ...summary, stage: "opening" }],
      "me/queries:get": { ...detail, stage: "opening", assessment: null },
      "me/queries:selfNotes": [],
      "reviews/queries:get": {
        can: { signPartOne: true, signAssessment: false },
      },
    });
    render(<MePage />);
    const timeline = screen.getByRole("navigation", { name: "Etapy oceny" });
    expect(within(timeline).queryByRole("link")).not.toBeInTheDocument();
    expect(within(timeline).getByText("Rozmowa rozpoczynająca")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Potwierdź zapoznanie z kryteriami" }),
    );
    expect(mocks.mutations.get("reviews/mutations:sign")).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId: "r1",
      scope: "part_one",
      place: "Warszawa",
    });
  });

  it("adds a self-note and shows an error from the backend", async () => {
    online();
    asRole("employee");
    serve({
      "me/queries:list": [summary],
      "me/queries:get": detail,
      "me/queries:selfNotes": [
        { _id: "n1", text: "Stara notatka", createdAt: 1 },
      ],
      "reviews/queries:get": null,
    });
    render(<MePage />);
    expect(screen.getByText("Stara notatka")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Nowa notatka"), "Nowa");
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz notatkę" }),
    );
    await waitFor(() =>
      expect(
        mocks.mutations.get("me/mutations:addSelfNote"),
      ).toHaveBeenCalledWith({
        actor: { role: "employee" },
        text: "Nowa",
        reviewId: "r1",
      }),
    );
  });
});
