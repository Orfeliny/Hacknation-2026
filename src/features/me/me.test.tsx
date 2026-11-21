import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { setDemoRole } from "../../lib/demoRole";
import { MePage } from "./MePage";

const useQueryMock = vi.hoisted(() => vi.fn());
const signMock = vi.hoisted(() => vi.fn());
const addNoteMock = vi.hoisted(() => vi.fn());
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: useQueryMock,
  useMutation: (ref: unknown) =>
    getFunctionName(ref as never) === "me/mutations:addNote"
      ? addNoteMock
      : signMock,
}));

const review = {
  _id: "r1",
  stage: "opening",
  round: 1,
  periodStart: "2025-01-01",
  periodEnd: "2025-12-31",
  dueDate: "2026-02-15",
  openingConversationDate: "2026-01-10",
  evaluationConversationDate: undefined,
  expectations: [{ criterionId: "komunikacja", text: "Jasniejsze raporty" }],
  developmentPlan: null,
  assessment: null,
  signatures: [],
  objection: null,
  endReason: undefined,
  evaluatorName: "Jan Kowalski",
};

function mockData(reviews: unknown[]) {
  useQueryMock.mockImplementation((ref: unknown) =>
    getFunctionName(ref as never) === "me/queries:myReviews" ? reviews : [],
  );
}

describe("MePage", () => {
  beforeEach(() => {
    setDemoRole("employee");
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    useQueryMock.mockReset();
    signMock.mockReset();
    addNoteMock.mockReset();
    setDemoRole("supervisor");
  });

  it("shows the employee's review with expectations and the stage", () => {
    mockData([review]);

    render(<MePage />);

    expect(screen.getByRole("heading", { name: "Moja ocena" })).toBeTruthy();
    expect(screen.getByText("Jasniejsze raporty")).toBeTruthy();
    expect(screen.getByText("Etap: Rozmowa rozpoczynająca")).toBeTruthy();
  });

  it("asks for the employee role when another role is selected", () => {
    setDemoRole("supervisor");
    mockData([]);

    render(<MePage />);

    expect(screen.getByText(/Ten widok jest dla roli „oceniany”/)).toBeTruthy();
  });

  it("shows the offline message without a backend", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_CONVEX_URL", "");
    mockData([]);

    render(<MePage />);

    expect(screen.getByText(/Tryb offline/)).toBeTruthy();
  });

  it("requires a place before signing", async () => {
    mockData([review]);

    render(<MePage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Podpisz część I" }),
    );

    expect(screen.getByRole("alert").textContent).toBe("Podaj miejscowość.");
    expect(signMock).not.toHaveBeenCalled();
  });

  it("signs part I through the existing reviews.sign mutation", async () => {
    mockData([review]);
    signMock.mockResolvedValue(undefined);

    render(<MePage />);
    await userEvent.type(screen.getByLabelText("Miejscowość"), "Warszawa");
    await userEvent.click(
      screen.getByRole("button", { name: "Podpisz część I" }),
    );

    expect(signMock).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId: "r1",
      scope: "part_one",
      place: "Warszawa",
    });
  });
});
