import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoRole } from "../../lib/demoRole";
import { DraftingPage } from "./DraftingPage";

const mocks = vi.hoisted(() => ({
  query: vi.fn<(name: string, args: unknown) => unknown>(),
  generate: vi.fn(),
  setStatus: vi.fn(),
  edit: vi.fn(),
  addManual: vi.fn(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: (ref: unknown, args: unknown) =>
    mocks.query(getFunctionName(ref as never), args),
  useAction: () => mocks.generate,
  useMutation: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name.endsWith(":setStatus")) return mocks.setStatus;
    if (name.endsWith(":edit")) return mocks.edit;
    return mocks.addManual;
  },
}));

type DraftFixture = {
  _id: string;
  reviewId: string;
  section: string;
  text: string;
  status: string;
  createdAt: number;
  criterionId?: string;
  observationIds?: string[];
  noEvidence?: boolean;
  inconsistency?: string;
  relatedDraftId?: string;
};

const draft = (patch: Partial<DraftFixture> = {}): DraftFixture => ({
  _id: "d1",
  reviewId: "r1",
  section: "criterion_justification",
  text: "Szkic uzasadnienia.",
  status: "proposed",
  createdAt: 1,
  criterionId: "komunikacja",
  observationIds: ["o1"],
  ...patch,
});

const view = (drafts: DraftFixture[] = [], ratings = true) => ({
  review: {
    id: "r1",
    stage: "writing",
    sheet: "C",
    employeeName: "Joanna Mazur",
  },
  ratings: ratings
    ? [
        {
          criterionId: "komunikacja",
          name: "Komunikacja",
          points: 7,
          label: "powyżej oczekiwań",
        },
      ]
    : [],
  drafts,
  evidence: [
    {
      id: "o1",
      date: "2026-06-01",
      sentiment: "development",
      criterionId: "komunikacja",
      text: "Mówi niejasno na naradach.",
    },
  ],
});

function serve(data: unknown) {
  mocks.query.mockImplementation((name) =>
    name.endsWith("listForReview") ? data : undefined,
  );
}

function renderPage(url = "/projekt?ocena=r1") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <DraftingPage />
    </MemoryRouter>,
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

describe("DraftingPage states", () => {
  it("shows an offline notice without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage();
    expect(
      screen.getByText(/wymaga połączenia z backendem/),
    ).toBeInTheDocument();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("tells an employee that the page is for the evaluator", () => {
    setDemoRole("employee");
    renderPage();
    expect(screen.getByText(/dla oceniającego/)).toBeInTheDocument();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("lists the reviews to choose from when none is open", () => {
    mocks.query.mockReturnValue([
      {
        _id: "r1",
        employeeName: "Joanna Mazur",
        sheet: "C",
        stageLabel: "Pisanie oceny",
      },
    ]);
    renderPage("/projekt");
    expect(screen.getByRole("link", { name: "Joanna Mazur" })).toHaveAttribute(
      "href",
      "/projekt?ocena=r1",
    );
  });

  it("waits while the draft loads", () => {
    mocks.query.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/Ładowanie projektu/)).toBeInTheDocument();
  });

  it("shows the reason from the backend when the role may not open the review", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockImplementation(() => {
      throw new ConvexError({
        code: "denied",
        message: "Projekt treści oceny widzi tylko oceniający.",
      });
    });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("tylko oceniający");
    expect(
      screen.getByRole("link", { name: "Wróć do listy ocen" }),
    ).toHaveAttribute("href", "/projekt");
  });
});

describe("generating", () => {
  it("says the draft is a proposal, shows the chosen ratings and offers to generate", async () => {
    serve(view());
    mocks.generate.mockResolvedValue({
      ok: true,
      inserted: 3,
      droppedActions: 0,
      provider: "mock",
    });
    renderPage();
    expect(screen.getByText(/propozycja do przejrzenia/)).toBeInTheDocument();
    expect(
      screen.getByText(/a AI ich nie wybiera ani nie zmienia/),
    ).toBeInTheDocument();
    const table = screen.getByRole("table", {
      name: "Oceny wybrane przez przełożonego",
    });
    expect(within(table).getByText("powyżej oczekiwań")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Wygeneruj projekt" }),
    );
    expect(mocks.generate).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      reviewId: "r1",
    });
  });

  it("shows what was sent to the model after a draft was generated", async () => {
    mocks.query.mockImplementation((name) => {
      if (name.endsWith("listForReview")) return view();
      if (name.endsWith("aiInteraction")) {
        return {
          provider: "mock",
          model: "mock",
          decision: "pending",
          sentPrompt: "Napisz projekt dla [PRACOWNIK].",
        };
      }
      return undefined;
    });
    mocks.generate.mockResolvedValue({
      ok: true,
      inserted: 3,
      droppedActions: 0,
      provider: "mock",
      interactionId: "i1",
    });
    renderPage();
    expect(screen.queryByText("Co wysłano do modelu")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Wygeneruj projekt" }),
    );
    expect(await screen.findByText("Co wysłano do modelu")).toBeInTheDocument();
    expect(
      screen.getByText(/Napisz projekt dla [PRACOWNIK]/),
    ).toBeInTheDocument();
  });

  it("does not offer a draft before ratings are chosen and links to the wizard", () => {
    serve(view([], false));
    renderPage();
    expect(
      screen.getByRole("button", { name: "Wygeneruj projekt" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "kreatorze oceny" }),
    ).toHaveAttribute("href", "/oceny?ocena=r1");
  });

  it("shows why generating failed and keeps manual writing available", async () => {
    serve(view());
    mocks.generate.mockResolvedValue({
      ok: false,
      code: "unavailable",
      message: "AI niedostępne. Możesz napisać fragmenty ręcznie.",
    });
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Wygeneruj projekt" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI niedostępne",
    );
    expect(
      screen.getByRole("button", { name: "Dodaj fragment" }),
    ).toBeInTheDocument();
  });

  it("offers to generate again once there are drafts", () => {
    serve(view([draft()]));
    renderPage();
    expect(
      screen.getByRole("button", { name: "Wygeneruj ponownie" }),
    ).toBeEnabled();
  });
});

describe("a fragment", () => {
  it("shows the text, its status, the cited observation and the inconsistency", () => {
    serve(
      view([
        draft({
          inconsistency: "Wysoka ocena, a obserwacje wskazują na rozwój.",
        }),
      ]),
    );
    renderPage();
    expect(screen.getByText("Szkic uzasadnienia.")).toBeInTheDocument();
    expect(screen.getByText("Propozycja")).toBeInTheDocument();
    expect(screen.getByText("Na podstawie obserwacji")).toBeInTheDocument();
    expect(screen.getByText("Mówi niejasno na naradach.")).toBeInTheDocument();
    expect(screen.getByText(/2026-06-01, rozwojowa/)).toBeInTheDocument();
    expect(screen.getByText(/Wysoka ocena, a obserwacje/)).toBeInTheDocument();
  });

  it("says there is no basis in the observations when none is cited, except for a general tip", () => {
    serve(
      view([
        draft({ _id: "d1", observationIds: [], noEvidence: true }),
        draft({
          _id: "d2",
          section: "feedback_tip",
          text: "Zacznij od faktu.",
          observationIds: [],
          noEvidence: true,
        }),
      ]),
    );
    renderPage();
    expect(screen.getAllByText("Brak podstawy w obserwacjach")).toHaveLength(1);
    expect(screen.getByText("Zacznij od faktu.")).toBeInTheDocument();
  });

  it("accepts, rejects and restores a fragment", async () => {
    serve(view([draft()]));
    mocks.setStatus.mockResolvedValue(null);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Akceptuj" }));
    expect(mocks.setStatus).toHaveBeenLastCalledWith({
      actor: { role: "supervisor" },
      draftId: "d1",
      status: "accepted",
    });
    await userEvent.click(screen.getByRole("button", { name: "Odrzuć" }));
    expect(mocks.setStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "rejected" }),
    );
  });

  it("offers to restore a rejected fragment", async () => {
    serve(view([draft({ status: "rejected" })]));
    mocks.setStatus.mockResolvedValue(null);
    renderPage();
    expect(
      screen.queryByRole("button", { name: "Odrzuć" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Przywróć" }));
    expect(mocks.setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "accepted" }),
    );
  });

  it("edits the text and can cancel", async () => {
    serve(view([draft()]));
    mocks.edit.mockResolvedValue(null);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    const box = screen.getByLabelText("Treść fragmentu");
    expect(box).toHaveValue("Szkic uzasadnienia.");
    await userEvent.clear(box);
    await userEvent.type(box, "Moje uzasadnienie.");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(mocks.edit).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      draftId: "d1",
      text: "Moje uzasadnienie.",
    });
    await userEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    await userEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(screen.queryByLabelText("Treść fragmentu")).not.toBeInTheDocument();
  });

  it("shows the message from the backend when a change is refused", async () => {
    serve(view([draft()]));
    mocks.setStatus.mockRejectedValue(
      new ConvexError({
        code: "denied",
        message: "Projekt treści oceny widzi tylko oceniający.",
      }),
    );
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Akceptuj" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "tylko oceniający",
    );
  });

  it("shows a fixed text for an error that is not a ConvexError", async () => {
    serve(view([draft()]));
    mocks.setStatus.mockRejectedValue(new Error("[Request ID] Server Error"));
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Akceptuj" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nie udało się zapisać zmiany",
    );
  });

  it("copies the text of a fragment", async () => {
    const user = userEvent.setup();
    serve(view([draft()]));
    renderPage();
    await user.click(screen.getByRole("button", { name: "Kopiuj" }));
    expect(await navigator.clipboard.readText()).toBe("Szkic uzasadnienia.");
    expect(
      await screen.findByText("Skopiowano do schowka."),
    ).toBeInTheDocument();
  });
});

describe("sections", () => {
  it("nests development actions under their area and shows a loose one apart", () => {
    serve(
      view([
        draft({
          _id: "area",
          section: "development_area",
          text: "Jasność wypowiedzi.",
          criterionId: undefined,
        }),
        draft({
          _id: "act",
          section: "development_action",
          text: "Kurs wystąpień.",
          relatedDraftId: "area",
          criterionId: undefined,
        }),
        draft({
          _id: "loose",
          section: "development_action",
          text: "Działanie ręczne.",
          criterionId: undefined,
          observationIds: [],
        }),
      ]),
    );
    renderPage();
    const nested = screen.getByRole("list", {
      name: "Działania dla tego obszaru",
    });
    expect(within(nested).getByText("Kurs wystąpień.")).toBeInTheDocument();
    expect(
      within(nested).queryByText("Działanie ręczne."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Działanie ręczne.")).toBeInTheDocument();
  });

  it("copies only the accepted and edited fragments of a section", async () => {
    const user = userEvent.setup();
    serve(
      view([
        draft({
          _id: "a",
          section: "strength",
          text: "Zaakceptowana.",
          status: "accepted",
          observationIds: [],
        }),
        draft({
          _id: "b",
          section: "strength",
          text: "Edytowana.",
          status: "edited",
          observationIds: [],
        }),
        draft({
          _id: "c",
          section: "strength",
          text: "Propozycja.",
          status: "proposed",
          observationIds: [],
        }),
        draft({
          _id: "d",
          section: "strength",
          text: "Odrzucona.",
          status: "rejected",
          observationIds: [],
        }),
      ]),
    );
    renderPage();
    await user.click(
      screen.getByRole("button", { name: "Kopiuj zaakceptowane" }),
    );
    expect(await navigator.clipboard.readText()).toBe(
      "Zaakceptowana.\n\nEdytowana.",
    );
  });

  it("offers no copy for a section with nothing accepted", () => {
    serve(view([draft({ section: "strength", observationIds: [] })]));
    renderPage();
    expect(
      screen.queryByRole("button", { name: "Kopiuj zaakceptowane" }),
    ).not.toBeInTheDocument();
  });
});

describe("adding a fragment by hand", () => {
  it("adds a justification for a chosen criterion and clears the box", async () => {
    serve(view());
    mocks.addManual.mockResolvedValue(null);
    renderPage();
    await userEvent.selectOptions(
      screen.getByLabelText("Część"),
      "criterion_justification",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium"),
      "komunikacja",
    );
    await userEvent.type(
      screen.getByLabelText("Treść"),
      "Własne uzasadnienie.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Dodaj fragment" }),
    );
    expect(mocks.addManual).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      reviewId: "r1",
      section: "criterion_justification",
      text: "Własne uzasadnienie.",
      criterionId: "komunikacja",
    });
    expect(screen.getByLabelText("Treść")).toHaveValue("");
  });

  it("sends no criterion for another section and keeps the button off for an empty text", async () => {
    serve(view());
    mocks.addManual.mockResolvedValue(null);
    renderPage();
    expect(
      screen.getByRole("button", { name: "Dodaj fragment" }),
    ).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Treść"), "Mocna strona.");
    await userEvent.click(
      screen.getByRole("button", { name: "Dodaj fragment" }),
    );
    expect(mocks.addManual).toHaveBeenCalledWith(
      expect.objectContaining({ section: "strength", criterionId: undefined }),
    );
  });

  it("shows the message when adding is refused", async () => {
    serve(view());
    mocks.addManual.mockRejectedValue(
      new ConvexError({
        code: "denied",
        message: "Tekst musi mieć od 1 do 2000 znaków.",
      }),
    );
    renderPage();
    await userEvent.type(screen.getByLabelText("Treść"), "x");
    await userEvent.click(
      screen.getByRole("button", { name: "Dodaj fragment" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("od 1 do 2000");
  });
});
