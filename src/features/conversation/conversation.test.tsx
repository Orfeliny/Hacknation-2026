import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationPage } from "./ConversationPage";
import { buildConversationIcs } from "./ics";
import { outcomesFormSchema, scheduleFormSchema } from "./schema";

const stubs = vi.hoisted(() => ({
  queries: new Map<string, unknown>(),
  calls: new Map<string, ReturnType<typeof vi.fn>>(),
}));

vi.mock("convex/react", async (importOriginal) => {
  const { getFunctionName: nameOf } = await import("convex/server");
  const callFor = (ref: Parameters<typeof nameOf>[0]) => {
    const name = nameOf(ref);
    if (!stubs.calls.has(name)) stubs.calls.set(name, vi.fn());
    return stubs.calls.get(name)!;
  };
  return {
    ...(await importOriginal<typeof import("convex/react")>()),
    useQuery: (ref: Parameters<typeof nameOf>[0]) =>
      stubs.queries.get(nameOf(ref)),
    useMutation: callFor,
    useAction: callFor,
  };
});

const EMPLOYEE = {
  _id: "emp1",
  firstName: "Anna",
  lastName: "Przykładowa",
  position: "Główny specjalista",
  email: "anna@urzad.example",
};

const CONVERSATION = {
  _id: "conv1",
  employeeId: "emp1",
  authorId: "boss1",
  kind: "evaluation",
  createdAt: 1,
  reviewId: "rev1",
};

function setData(options: { conversation?: Record<string, unknown> | null }) {
  stubs.queries.set("employees/queries:team", [EMPLOYEE]);
  stubs.queries.set("conversations/queries:openReview", {
    reviewId: "rev1",
    sheet: "C",
    stage: "observation",
  });
  stubs.queries.set(
    "conversations/queries:listForEmployee",
    options.conversation === null
      ? []
      : [{ ...CONVERSATION, ...options.conversation }],
  );
}

const callOf = (name: string) => {
  if (!stubs.calls.has(name)) stubs.calls.set(name, vi.fn());
  return stubs.calls.get(name)!;
};

function renderPage(search = "?pracownik=emp1&rodzaj=evaluation") {
  return render(
    <MemoryRouter initialEntries={[`/rozmowy${search}`]}>
      <ConversationPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
  stubs.queries.clear();
  stubs.calls.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("form schemas", () => {
  it("bounds the duration and requires a date and time", () => {
    const base = { startsAt: "2099-01-01T10:00", location: "" };
    expect(
      scheduleFormSchema.safeParse({ ...base, durationMinutes: 60 }).success,
    ).toBe(true);
    expect(
      scheduleFormSchema.safeParse({ ...base, durationMinutes: 5 }).success,
    ).toBe(false);
    expect(
      scheduleFormSchema.safeParse({ ...base, durationMinutes: 481 }).success,
    ).toBe(false);
    expect(
      scheduleFormSchema.safeParse({
        startsAt: "",
        durationMinutes: 60,
        location: "",
      }).success,
    ).toBe(false);
  });

  it("rejects a conversation held after today", () => {
    const schema = outcomesFormSchema("2026-11-22");
    expect(
      schema.safeParse({ heldOn: "2026-11-22", outcomes: "" }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ heldOn: "2026-11-23", outcomes: "" }).success,
    ).toBe(false);
  });
});

describe("ConversationPage offline", () => {
  it("shows the offline state and no form", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Tryb offline");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ConversationPage", () => {
  it("opens the person and kind from the query string", () => {
    setData({});
    renderPage("?pracownik=emp1&rodzaj=feedback");
    expect(screen.getByRole("combobox", { name: "Pracownik" })).toHaveValue(
      "emp1",
    );
    expect(screen.getByRole("button", { name: "Bieżąca" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Oceniająca" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("starts a conversation for the open review", async () => {
    setData({ conversation: null });
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij przygotowanie" }),
    );
    expect(callOf("conversations/mutations:create")).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      employeeId: "emp1",
      kind: "evaluation",
      reviewId: "rev1",
    });
  });

  it("asks the AI only for questions and marks them with the AI badge", async () => {
    setData({});
    callOf("conversations/actions:prepare").mockResolvedValue({
      ok: false,
      code: "unavailable",
      message: "AI jest niedostępne. Możesz napisać plan samodzielnie.",
    });
    renderPage();
    expect(await screen.findByText("AI demonstracyjne")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Podpowiedz pytania" }),
    );
    expect(callOf("conversations/actions:prepare")).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      conversationId: "conv1",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI jest niedostępne",
    );
  });

  it("shows the extra criteria the AI suggests at an opening conversation", async () => {
    setData({
      conversation: {
        kind: "opening",
        plan: { goal: "Ustalić kryteria.", questions: [{ text: "Pytanie?" }] },
      },
    });
    callOf("conversations/actions:prepare").mockResolvedValue({
      ok: true,
      provider: "mock",
      plan: {
        goal: "Ustalić kryteria.",
        agenda: ["Cele"],
        questions: [{ text: "Pytanie?" }],
        tips: [],
        suggestedCriteria: [
          { criterionId: "myslenie_analityczne", reason: "Dużo analiz." },
        ],
      },
    });
    renderPage("?pracownik=emp1&rodzaj=opening");
    await userEvent.click(
      screen.getByRole("button", { name: "Podpowiedz pytania" }),
    );
    expect(await screen.findByText(/Dużo analiz\./)).toBeInTheDocument();
  });

  it("lists the stored plan and hides the hints on request", async () => {
    setData({
      conversation: {
        plan: {
          goal: "Podsumować okres.",
          questions: [
            { criterionId: "rzetelnosc", text: "Co było najtrudniejsze?" },
          ],
        },
      },
    });
    renderPage();
    expect(screen.getByText("Co było najtrudniejsze?")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Ukryj podpowiedzi" }),
    );
    expect(
      screen.queryByText("Co było najtrudniejsze?"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pokaż podpowiedzi" }),
    ).toBeInTheDocument();
  });

  it("saves the outcomes with the date of the conversation", async () => {
    setData({});
    renderPage();
    fireEvent.change(screen.getByLabelText("Ustalenia z rozmowy"), {
      target: { value: "Cotygodniowy przegląd zadań." },
    });
    fireEvent.change(screen.getByLabelText("Data rozmowy"), {
      target: { value: "2026-11-20" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Oznacz jako odbytą" }),
    );
    expect(callOf("conversations/mutations:saveOutcomes")).toHaveBeenCalledWith(
      {
        actor: { role: "supervisor" },
        conversationId: "conv1",
        heldOn: "2026-11-20",
        outcomes: "Cotygodniowy przegląd zadań.",
      },
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "rozmowa odbyła się 20.11.2026",
    );
  });

  it("does not save a conversation dated in the future", async () => {
    setData({});
    renderPage();
    fireEvent.change(screen.getByLabelText("Data rozmowy"), {
      target: { value: "2099-01-01" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Oznacz jako odbytą" }),
    );
    expect(await screen.findByText(/w przyszłości/)).toBeInTheDocument();
    expect(
      stubs.calls.get("conversations/mutations:saveOutcomes"),
    ).not.toHaveBeenCalled();
  });

  it("sends the invitation through mail.scheduleConversation", async () => {
    setData({});
    renderPage();
    fireEvent.change(screen.getByLabelText("Termin rozmowy"), {
      target: { value: "2099-01-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Miejsce (opcjonalnie)"), {
      target: { value: "Sala 12" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij zaproszenie" }),
    );
    expect(callOf("mail/mutations:scheduleConversation")).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      conversationId: "conv1",
      scheduledAt: new Date("2099-01-01T10:00").getTime(),
      durationMinutes: 60,
      location: "Sala 12",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Zaproszenie zostało wysłane",
    );
  });

  it("refuses an appointment in the past and one shorter than 15 minutes", async () => {
    setData({});
    renderPage();
    fireEvent.change(screen.getByLabelText("Termin rozmowy"), {
      target: { value: "2020-01-01T10:00" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij zaproszenie" }),
    );
    expect(await screen.findByText(/w przyszłości/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Czas trwania (minuty)"), {
      target: { value: "5" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij zaproszenie" }),
    );
    expect(await screen.findByText(/co najmniej 15 minut/)).toBeInTheDocument();
    expect(
      stubs.calls.get("mail/mutations:scheduleConversation"),
    ).not.toHaveBeenCalled();
  });

  it("downloads the .ics without any network request", async () => {
    setData({
      conversation: {
        scheduledAt: new Date("2099-01-01T10:00").getTime(),
        durationMinutes: 45,
        location: "Sala 12",
        icsUid: "conv1@asystent-ocen",
        icsSequence: 0,
      },
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const createObjectURL = vi.fn(() => "blob:ics");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL }));
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Pobierz plik .ics" }),
    );
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    const text = await blob.text();
    expect(blob.type).toContain("text/calendar");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("UID:conv1@asystent-ocen");
    expect(text).toContain("DTSTART:20990101T");
    expect(text).toContain("ATTENDEE;CN=Anna Przykładowa");
    expect(click).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it("gives every button and link on the page a unique name", () => {
    setData({
      conversation: {
        plan: { questions: [{ text: "Pytanie?" }] },
        scheduledAt: new Date("2099-01-01T10:00").getTime(),
      },
    });
    renderPage();
    const names = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("link"),
    ].map((el) => el.textContent?.trim());
    expect(new Set(names).size).toBe(names.length);
  });

  it("counts finished checklist items", async () => {
    setData({});
    renderPage();
    const list = screen.getByRole("region", {
      name: /Lista kontrolna/,
    });
    expect(within(list).getByText("Gotowe: 0 z 5")).toBeInTheDocument();
    await userEvent.click(
      within(list).getByRole("checkbox", {
        name: "Przejrzane obserwacje z całego okresu",
      }),
    );
    expect(within(list).getByText("Gotowe: 1 z 5")).toBeInTheDocument();
  });
});

describe("buildConversationIcs", () => {
  it("bumps the sequence into a reschedule subject", () => {
    const ics = buildConversationIcs({
      conversationId: "c",
      authorId: "a",
      employeeId: "e",
      kind: "opening",
      scheduledAt: Date.UTC(2099, 0, 1, 9),
      durationMinutes: 30,
      icsSequence: 2,
      evaluator: { name: "Katarzyna Wiśniewska" },
      employee: { name: "Anna Przykładowa" },
    });
    expect(ics).toContain("SEQUENCE:2");
    expect(ics).toContain("Zmiana terminu");
    expect(ics).toContain("UID:c@asystent-ocen");
  });
});
