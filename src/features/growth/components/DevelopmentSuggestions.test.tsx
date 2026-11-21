import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevelopmentSuggestions } from "./DevelopmentSuggestions";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), rank: vi.fn() }));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useAction: () => mocks.rank,
}));

function suggestion(n: number, source = "demo") {
  return {
    option: {
      _id: `o${n}`,
      _creationTime: 1,
      title: `Opcja ${n}`,
      description: `Opis ${n}`,
      form: "szkolenie",
      criterionIds: ["komunikacja"],
      level: "podstawowy",
      cost: "brak_danych",
      source,
      active: true,
    },
    matchedCriterionIds: ["komunikacja"],
    reason: `Pasuje do kryterium: Komunikacja (${n})`,
  };
}

const many = (n: number) =>
  Array.from({ length: n }, (_, i) => suggestion(i + 1));

afterEach(() => vi.clearAllMocks());

describe("DevelopmentSuggestions", () => {
  it("shows rule results with the reason and the demo label, no AI button for a short list", () => {
    mocks.useQuery.mockReturnValue(many(2));
    render(<DevelopmentSuggestions criterionIds={["komunikacja"]} />);
    expect(screen.getByText("Opcja 1")).toBeInTheDocument();
    expect(
      screen.getByText(/Pasuje do kryterium: Komunikacja \(2\)/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Dane demonstracyjne")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Uporządkuj z AI" }),
    ).toBeNull();
  });

  it("shows the empty state with a general tip", () => {
    mocks.useQuery.mockReturnValue([]);
    render(<DevelopmentSuggestions criterionIds={["komunikacja"]} />);
    expect(
      screen.getByText("Brak wpisów w katalogu dla tego obszaru."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wskazówka ogólna/)).toBeInTheDocument();
  });

  it("replaces the list with the AI order and rationale", async () => {
    mocks.useQuery.mockReturnValue(many(6));
    mocks.rank.mockResolvedValue({
      ranking: "ai",
      suggestions: [{ ...suggestion(4), rationale: "Najlepiej pasuje." }],
    });
    render(<DevelopmentSuggestions criterionIds={["komunikacja"]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Uporządkuj z AI" }),
    );
    expect(
      await screen.findByText("AI: Najlepiej pasuje."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Opcja 1")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Uporządkuj z AI" }),
    ).toBeNull();
  });

  it("keeps the rule list and shows the note when ranking falls back", async () => {
    mocks.useQuery.mockReturnValue(many(6));
    mocks.rank.mockResolvedValue({
      ranking: "rules",
      suggestions: many(6),
      note: "Bez rankingu AI: tryb mock.",
    });
    render(<DevelopmentSuggestions criterionIds={["komunikacja"]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Uporządkuj z AI" }),
    );
    expect(
      await screen.findByText("Bez rankingu AI: tryb mock."),
    ).toBeInTheDocument();
    expect(screen.getByText("Opcja 6")).toBeInTheDocument();
  });

  it("keeps the list usable when the action throws", async () => {
    mocks.useQuery.mockReturnValue(many(6));
    mocks.rank.mockRejectedValue(new Error("boom"));
    render(<DevelopmentSuggestions criterionIds={["komunikacja"]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Uporządkuj z AI" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nie udało się uporządkować z AI",
    );
    expect(screen.getByText("Opcja 1")).toBeInTheDocument();
  });
});
