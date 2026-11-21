import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoRole } from "../../lib/demoRole";
import { HrPartnerPage } from "./HrPartnerPage";

const mocks = vi.hoisted(() => ({
  query: vi.fn<(name: string, args: unknown) => unknown>(),
  recommend: vi.fn(),
  ask: vi.fn(),
  setStatus: vi.fn(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: (ref: unknown, args: unknown) =>
    mocks.query(getFunctionName(ref as never), args),
  useAction: (ref: unknown) =>
    getFunctionName(ref as never).endsWith("recommend")
      ? mocks.recommend
      : mocks.ask,
  useMutation: () => mocks.setStatus,
}));

type TestSignal = {
  kind: string;
  reason: string;
  evidenceDate: string;
  signalId: string | null;
  recommendations: { text: string; kind: string }[] | null;
};

const WORKLOAD: TestSignal = {
  kind: "workload",
  reason:
    "Co najmniej 3 obserwacje dotyczące obciążenia lub dobrostanu w ciągu 42 dni, ostatnia z 2026-11-17",
  evidenceDate: "2026-11-17",
  signalId: null,
  recommendations: null,
};

const team = (signals: TestSignal[] = [WORKLOAD]) => ({
  today: "2026-11-21",
  team: [
    {
      employee: {
        id: "e1",
        firstName: "Joanna",
        lastName: "Mazur",
        position: "Główny analityk",
        unit: "Wydział",
      },
      signals,
    },
    {
      employee: {
        id: "e2",
        firstName: "Adam",
        lastName: "Kowal",
        position: "Radca",
        unit: "Wydział",
      },
      signals: [],
    },
  ],
});

function serve(data: unknown) {
  mocks.query.mockImplementation((name: string) =>
    name.endsWith("listForSupervisor") || name.endsWith("hrSummary")
      ? data
      : undefined,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
  setDemoRole("supervisor");
});
afterEach(() => {
  vi.unstubAllEnvs();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe("HrPartnerPage", () => {
  it("shows an offline notice without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(<HrPartnerPage />);
    expect(
      screen.getByText(/wymaga połączenia z backendem/),
    ).toBeInTheDocument();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("tells an employee that the page is for supervisors", () => {
    setDemoRole("employee");
    render(<HrPartnerPage />);
    expect(screen.getByText(/dla przełożonych/)).toBeInTheDocument();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("says that signals are a hint, lists them with their reason and shows who has none", () => {
    serve(team());
    render(<HrPartnerPage />);
    expect(screen.getByText(/podpowiedź, a nie diagnoza/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Joanna Mazur" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Możliwe przeciążenie")).toBeInTheDocument();
    expect(screen.getByText(WORKLOAD.reason)).toBeInTheDocument();
    expect(screen.getAllByText("Brak sygnałów.")).toHaveLength(1);
  });

  it("waits while the team loads and handles a supervisor with no reports", () => {
    mocks.query.mockReturnValue(undefined);
    const { unmount } = render(<HrPartnerPage />);
    expect(screen.getByText(/Ładowanie zespołu/)).toBeInTheDocument();
    unmount();
    serve({ today: "2026-11-21", team: [] });
    render(<HrPartnerPage />);
    expect(
      screen.getByText(/Nie masz przypisanych pracowników/),
    ).toBeInTheDocument();
  });

  it("asks for recommendations and shows them with their kind", async () => {
    serve(team());
    mocks.recommend.mockResolvedValue({
      ok: true,
      provider: "mock",
      recommendations: [
        { text: "Odciąż jedno zadanie.", kind: "organizational" },
        { text: "Porozmawiaj o priorytetach.", kind: "conversation" },
        { text: "Zaplanuj przerwę.", kind: "wellbeing" },
      ],
    });
    render(<HrPartnerPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Pokaż rekomendacje" }),
    );
    expect(mocks.recommend).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      employeeId: "e1",
      kind: "workload",
      reason: WORKLOAD.reason,
    });
    expect(
      await screen.findByText("Odciąż jedno zadanie."),
    ).toBeInTheDocument();
    expect(screen.getByText("Organizacja pracy:")).toBeInTheDocument();
    expect(screen.getByText("Rozmowa:")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pokaż rekomendacje" }),
    ).not.toBeInTheDocument();
  });

  it("shows the stored recommendations without asking again", () => {
    serve(
      team([
        {
          ...WORKLOAD,
          signalId: "s1",
          recommendations: [
            { text: "Zapisana podpowiedź.", kind: "preventive" },
          ],
        },
      ]),
    );
    render(<HrPartnerPage />);
    expect(screen.getByText("Zapisana podpowiedź.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pokaż rekomendacje" }),
    ).not.toBeInTheDocument();
  });

  it("shows why the model could not help and lets the supervisor try again", async () => {
    serve(team());
    mocks.recommend.mockResolvedValue({
      ok: false,
      code: "unavailable",
      message: "AI niedostępne. Spróbuj ponownie za chwilę.",
    });
    render(<HrPartnerPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Pokaż rekomendacje" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI niedostępne",
    );
    expect(
      screen.getByRole("button", { name: "Pokaż rekomendacje" }),
    ).toBeEnabled();
  });

  it("marks a signal as acted on or dismisses it", async () => {
    serve(team());
    mocks.setStatus.mockResolvedValue(null);
    render(<HrPartnerPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Oznacz jako zrobione" }),
    );
    expect(mocks.setStatus).toHaveBeenLastCalledWith({
      actor: { role: "supervisor" },
      employeeId: "e1",
      kind: "workload",
      reason: WORKLOAD.reason,
      status: "acted",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Odrzuć sygnał" }),
    );
    expect(mocks.setStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "dismissed" }),
    );
  });

  it("shows the reason when a status change is refused", async () => {
    serve(team());
    mocks.setStatus.mockRejectedValue(
      new ConvexError({
        code: "denied",
        message: "Sygnał jest już nieaktualny.",
      }),
    );
    render(<HrPartnerPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Odrzuć sygnał" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("nieaktualny");
  });
});

describe("AskPanel", () => {
  it("keeps the button off until there is a question and limits its length", async () => {
    serve(team());
    render(<HrPartnerPage />);
    const button = screen.getByRole("button", { name: "Zapytaj" });
    const box = screen.getByLabelText("Pytanie");
    expect(button).toBeDisabled();
    expect(box).toHaveAttribute("maxlength", "1000");
    await userEvent.type(box, "  Jak zacząć?  ");
    expect(button).toBeEnabled();
    expect(screen.getByText("15 / 1000 znaków")).toBeInTheDocument();
  });

  it("sends the trimmed question about the chosen employee and shows the answer", async () => {
    serve(team());
    mocks.ask.mockResolvedValue({
      ok: true,
      provider: "mock",
      answer: "Zacznij od rozmowy.",
      suggestions: ["Umów spotkanie."],
    });
    render(<HrPartnerPage />);
    await userEvent.selectOptions(
      screen.getByLabelText(/Dotyczy pracownika/),
      "e1",
    );
    await userEvent.type(screen.getByLabelText("Pytanie"), "  Jak zacząć?  ");
    await userEvent.click(screen.getByRole("button", { name: "Zapytaj" }));
    expect(mocks.ask).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      employeeId: "e1",
      question: "Jak zacząć?",
    });
    expect(await screen.findByText("Zacznij od rozmowy.")).toBeInTheDocument();
    expect(screen.getByText("Umów spotkanie.")).toBeInTheDocument();
  });

  it("sends no employee for a general question", async () => {
    serve(team());
    mocks.ask.mockResolvedValue({
      ok: true,
      provider: "mock",
      answer: "Odpowiedź.",
      suggestions: [],
    });
    render(<HrPartnerPage />);
    await userEvent.type(screen.getByLabelText("Pytanie"), "Pytanie ogólne");
    await userEvent.click(screen.getByRole("button", { name: "Zapytaj" }));
    expect(mocks.ask).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: undefined }),
    );
  });

  it("shows a typed error and a failure of the call itself", async () => {
    serve(team());
    mocks.ask.mockResolvedValueOnce({
      ok: false,
      code: "too_long",
      message: "Pytanie jest za długie. Skróć je do 1000 znaków.",
    });
    render(<HrPartnerPage />);
    await userEvent.type(screen.getByLabelText("Pytanie"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Zapytaj" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("za długie");
    mocks.ask.mockRejectedValueOnce(new Error("sieć"));
    await userEvent.click(screen.getByRole("button", { name: "Zapytaj" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Nie udało się zapytać",
      ),
    );
  });
});

describe("HR view", () => {
  beforeEach(() => setDemoRole("hr"));

  it("shows counts per kind and no names", () => {
    serve({
      today: "2026-11-21",
      employees: 8,
      perKind: [
        { kind: "workload", signals: 2, employees: 2 },
        { kind: "recognition_moment", signals: 1, employees: 1 },
      ],
    });
    render(<HrPartnerPage />);
    const table = screen.getByRole("table", { name: "Sygnały według rodzaju" });
    const row = within(table).getByRole("row", {
      name: /Możliwe przeciążenie/,
    });
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["2", "2"]);
    expect(screen.getByText(/Nie zawiera nazwisk/)).toBeInTheDocument();
    expect(screen.queryByText("Mazur")).not.toBeInTheDocument();
  });

  it("says so when there are no signals", () => {
    serve({ today: "2026-11-21", employees: 3, perKind: [] });
    render(<HrPartnerPage />);
    expect(screen.getByText("Brak sygnałów w urzędzie.")).toBeInTheDocument();
  });
});

describe("a role that has no view", () => {
  it("shows the reason from the backend instead of crashing", () => {
    setDemoRole("admin");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockImplementation(() => {
      throw new ConvexError({
        code: "denied",
        message: "Dla wybranej roli nie ma przypisanego pracownika.",
      });
    });
    render(<HrPartnerPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("nie ma przypisanego");
  });
});

describe("errors from the backend", () => {
  it("shows a fixed text for an error that is not a ConvexError", async () => {
    serve(team());
    mocks.setStatus.mockRejectedValue(new Error("[Request ID] Server Error"));
    render(<HrPartnerPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Odrzuć sygnał" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nie udało się wykonać operacji. Spróbuj ponownie.",
    );
  });
});
