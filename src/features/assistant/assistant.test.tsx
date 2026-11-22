import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  knowledgeStore,
  ask as demoAsk,
} from "../../lib/backend/demo/knowledgeDocs";
import { setDemoRole } from "../../lib/demoRole";
import { AssistantPage } from "./AssistantPage";
import { NOT_FOUND_MESSAGE } from "./AnswerView";
import {
  ALLOWED_QUESTIONS,
  REFUSED_QUESTIONS,
  TEST_QUESTIONS,
} from "./questions";
import { asksForPersonRating, REFUSAL_MESSAGE } from "./refusal";

const mocks = vi.hoisted(() => ({ ask: vi.fn() }));

vi.mock("../../lib/backend/knowledgeDocs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/backend/knowledgeDocs")>()),
  useAskKnowledge: () => mocks.ask,
}));

const documentId = "doc" as never;

function renderPage() {
  return render(
    <MemoryRouter>
      <AssistantPage />
    </MemoryRouter>,
  );
}

async function ask(question: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Pytanie do asystenta"), question);
  await user.click(screen.getByRole("button", { name: "Zapytaj asystenta" }));
  return user;
}

beforeEach(() => {
  mocks.ask.mockReset();
  setDemoRole("employee");
});

describe("AssistantPage", () => {
  it("shows the answer with citations split into office documents and law", async () => {
    mocks.ask.mockResolvedValue({
      answer: "Ocena jest wystawiana raz na dwa lata.",
      citations: [
        {
          kind: "law",
          title: "Ustawa o służbie cywilnej",
          locator: "Art. 51.",
        },
        { kind: "office", title: "Regulamin pracy", locator: "§ 12" },
      ],
    });
    renderPage();
    await ask("Jak często jest ocena?");
    expect(
      await screen.findByText("Ocena jest wystawiana raz na dwa lata."),
    ).toBeInTheDocument();
    expect(mocks.ask).toHaveBeenCalledWith({
      question: "Jak często jest ocena?",
    });
    expect(
      screen.getByRole("heading", { name: "Dokumenty urzędu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Przepisy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Ustawa o służbie cywilnej, Art. 51.",
      }),
    ).toBeInTheDocument();
  });

  it("says it did not find the answer when the backend returns null", async () => {
    mocks.ask.mockResolvedValue({ answer: null, citations: [] });
    renderPage();
    await ask("Jaka jest stolica Francji?");
    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Przepisy" })).toBeNull();
  });

  it("opens the source excerpt and locator when a citation is clicked", async () => {
    mocks.ask.mockResolvedValue({
      answer: "Odpowiedź.",
      citations: [
        {
          kind: "law",
          title: "Rozporządzenie o ocenie",
          locator: "§ 4 ust. 1",
          excerpt: "Ocena okresowa jest dokonywana co dwa lata.",
        },
      ],
    });
    renderPage();
    const user = await ask("Pytanie o ocenę");
    await user.click(
      await screen.findByRole("button", {
        name: "Rozporządzenie o ocenie, § 4 ust. 1",
      }),
    );
    expect(
      await screen.findByText("Ocena okresowa jest dokonywana co dwa lata."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Miejsce w źródle: § 4 ust. 1"),
    ).toBeInTheDocument();
  });

  it("links to the document in the panel only for HR and admin", async () => {
    mocks.ask.mockResolvedValue({
      answer: "Odpowiedź.",
      citations: [
        {
          kind: "office",
          title: "Regulamin pracy",
          locator: "§ 1",
          documentId,
          excerpt: "Fragment.",
        },
      ],
    });
    setDemoRole("hr");
    renderPage();
    const user = await ask("Pytanie o termin");
    await user.click(
      await screen.findByRole("button", { name: "Regulamin pracy, § 1" }),
    );
    expect(
      await screen.findByRole("link", {
        name: "Otwórz dokument w panelu dokumentów",
      }),
    ).toHaveAttribute("href", "/ustawienia/dokumenty");
  });

  it("does not link to the document for an employee", async () => {
    mocks.ask.mockResolvedValue({
      answer: "Odpowiedź.",
      citations: [
        {
          kind: "office",
          title: "Regulamin pracy",
          locator: "§ 1",
          documentId,
        },
      ],
    });
    renderPage();
    const user = await ask("Pytanie o termin");
    await user.click(
      await screen.findByRole("button", { name: "Regulamin pracy, § 1" }),
    );
    expect(
      await screen.findByText(
        "Fragment źródła nie jest dostępny. Sprawdź go w dokumencie.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /panelu dokumentów/ }),
    ).toBeNull();
  });

  it("shows a possible conflict and asks for manual verification", async () => {
    mocks.ask.mockResolvedValue({
      answer: "Urząd i ustawa podają inne terminy.",
      citations: [
        { kind: "office", title: "Regulamin pracy", locator: "§ 3" },
        { kind: "law", title: "Ustawa", locator: "Art. 2." },
      ],
      possibleConflict: true,
    });
    renderPage();
    await ask("Jaki jest termin?");
    expect(
      await screen.findByText(/Możliwy konflikt źródeł/),
    ).toHaveTextContent("Zweryfikuj ręcznie");
  });

  it("refuses to name the rating level of a person without calling the backend", async () => {
    renderPage();
    await ask("Jaką ocenę powinien dostać Jan Kowalski?");
    expect(await screen.findByText(REFUSAL_MESSAGE)).toBeInTheDocument();
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("shows the message of a backend error and keeps the page usable", async () => {
    const { ConvexError } = await import("convex/values");
    mocks.ask.mockRejectedValue(
      new ConvexError({
        code: "unavailable",
        message: "Model jest niedostępny.",
      }),
    );
    renderPage();
    await ask("Pytanie o ocenę");
    expect(
      await screen.findByText("Model jest niedostępny."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Zapytaj asystenta" }),
    ).toBeEnabled();
  });

  it("asks for a question when the field is empty", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Zapytaj asystenta" }));
    expect(await screen.findByText("Wpisz pytanie.")).toBeInTheDocument();
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("asks an example question when it is clicked", async () => {
    mocks.ask.mockResolvedValue({ answer: null, citations: [] });
    renderPage();
    const example = TEST_QUESTIONS[0]?.question ?? "";
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: example }));
    await waitFor(() =>
      expect(mocks.ask).toHaveBeenCalledWith({ question: example }),
    );
    expect(
      within(screen.getByRole("region", { name: "Rozmowa" })).getByText(
        example,
      ),
    ).toBeInTheDocument();
  });
});

describe("asksForPersonRating", () => {
  it.each(REFUSED_QUESTIONS)("refuses: %s", (question) => {
    expect(asksForPersonRating(question)).toBe(true);
  });

  it("does not refuse questions about the rules, including the scale of levels", () => {
    for (const { question } of TEST_QUESTIONS) {
      expect(asksForPersonRating(question), question).toBe(false);
    }
  });

  it.each(ALLOWED_QUESTIONS)("does not refuse: %s", (question) => {
    expect(asksForPersonRating(question)).toBe(false);
  });
});

describe("test questions on the demo backend", () => {
  const rows = () => knowledgeStore.get();
  const outside = TEST_QUESTIONS.filter((q) => q.expectedSources.length === 0);
  const inside = TEST_QUESTIONS.filter((q) => q.expectedSources.length > 0);

  it("has ten questions, two of them outside the knowledge base", () => {
    expect(TEST_QUESTIONS).toHaveLength(10);
    expect(outside).toHaveLength(2);
  });

  it("answers with a citation for questions from the base", () => {
    for (const { question } of inside) {
      const result = demoAsk(rows(), { actor: { role: "employee" }, question });
      expect(result.answer, question).not.toBeNull();
      expect(result.citations.length, question).toBeGreaterThan(0);
    }
  });

  it("answers 'nie wiem' for questions outside the base", () => {
    for (const { question } of outside) {
      const result = demoAsk(rows(), { actor: { role: "employee" }, question });
      expect(result.answer, question).toBeNull();
      expect(result.citations, question).toEqual([]);
    }
  });
});
