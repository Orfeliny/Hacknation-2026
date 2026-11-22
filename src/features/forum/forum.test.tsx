import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FORUM_LIMITS } from "../../../convex/lib/contracts/forum";
import { ForumPage } from "./ForumPage";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  create: vi.fn(),
  reply: vi.fn(),
  report: vi.fn(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useMutation: (fn: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(fn);
    if (name === "forum/mutations:createThread") return mocks.create;
    if (name === "forum/mutations:reply") return mocks.reply;
    return mocks.report;
  },
}));

type Row = {
  threadId: string;
  kind: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorUnit: string;
  criterionId?: string;
  createdAt: number;
  replyCount: number;
  reported: boolean;
};

const row = (n: number, over: Partial<Row> = {}): Row => ({
  threadId: `t${n}`,
  kind: "question",
  title: `Wątek ${n}`,
  excerpt: `Fragment ${n}`,
  authorName: "Anna Przykładowa",
  authorUnit: "Wydział Kontroli Planowej",
  createdAt: Date.UTC(2026, 10, n),
  replyCount: n,
  reported: false,
  ...over,
});

const threads = [
  row(1, { kind: "question", criterionId: "komunikacja" }),
  row(2, { kind: "offer", criterionId: "wspolpraca", reported: true }),
  row(3, { kind: "question", criterionId: "wspolpraca" }),
];

const detail = {
  thread: {
    threadId: "t1",
    kind: "question",
    title: "Wątek 1",
    body: "Treść <b>pogrubiona</b>\ndruga linia",
    authorName: "Anna Przykładowa",
    authorUnit: "Wydział Kontroli Planowej",
    criterionId: "komunikacja",
    createdAt: Date.UTC(2026, 10, 1),
    reported: false,
  },
  replies: [
    {
      replyId: "r1",
      body: "Pierwsza odpowiedź",
      authorName: "Jan Kowalski",
      createdAt: Date.UTC(2026, 10, 2),
    },
  ],
};

function serve(thread: unknown = detail) {
  mocks.useQuery.mockImplementation(
    (
      fn: Parameters<typeof getFunctionName>[0],
      args: Record<string, string>,
    ) => {
      if (getFunctionName(fn) === "forum/queries:listThreads") {
        return threads.filter(
          (t) =>
            (!args.kind || t.kind === args.kind) &&
            (!args.criterionId || t.criterionId === args.criterionId),
        );
      }
      return thread;
    },
  );
}

const renderAt = (path = "/forum") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ForumPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
  mocks.create.mockResolvedValue("t9");
  mocks.reply.mockResolvedValue("r9");
  mocks.report.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mocks.useQuery.mockReset();
});

describe("forum list", () => {
  it("shows an offline notice without calling the backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderAt();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("lists threads with the author, reply count and the reported marker", () => {
    serve();
    renderAt();
    expect(screen.getAllByRole("link", { name: /Otwórz wątek/ })).toHaveLength(
      3,
    );
    expect(screen.getByText("Fragment 2")).toBeInTheDocument();
    expect(screen.getAllByText("zgłoszony")).toHaveLength(1);
    expect(screen.getAllByText(/odpowiedzi: \d/)).toHaveLength(3);
  });

  it("narrows the list by type and by criterion", async () => {
    serve();
    renderAt();
    await userEvent.selectOptions(
      screen.getByLabelText("Rodzaj wątku", { selector: "#filter-kind" }),
      "offer",
    );
    expect(screen.getAllByRole("link", { name: /Otwórz wątek/ })).toHaveLength(
      1,
    );
    expect(screen.getByRole("link", { name: /Wątek 2/ })).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Rodzaj wątku", { selector: "#filter-kind" }),
      "",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Kryterium", { selector: "#filter-criterion" }),
      "wspolpraca",
    );
    expect(screen.getAllByRole("link", { name: /Otwórz wątek/ })).toHaveLength(
      2,
    );
  });

  it("gives every list link a unique accessible name", () => {
    serve();
    renderAt();
    const names = screen
      .getAllByRole("link", { name: /Otwórz wątek/ })
      .map((l) => l.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(names.length);
  });

  it("shows an empty state, with and without filters", async () => {
    mocks.useQuery.mockReturnValue([]);
    renderAt();
    expect(
      screen.getByText(/Nie ma jeszcze żadnych wątków/),
    ).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Rodzaj wątku", { selector: "#filter-kind" }),
      "offer",
    );
    expect(
      screen.getByText(/Brak wątków dla wybranych filtrów/),
    ).toBeInTheDocument();
  });

  it("does not crash when the query fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useQuery.mockImplementation(() => {
      throw new Error("boom");
    });
    renderAt();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się wczytać wątków",
    );
    spy.mockRestore();
  });
});

describe("new thread", () => {
  async function fill(title: string, body: string) {
    const form = screen
      .getByRole("heading", { name: "Nowy wątek" })
      .closest("form")!;
    const inside = within(form);
    if (title) await userEvent.type(inside.getByLabelText("Tytuł"), title);
    if (body) await userEvent.type(inside.getByLabelText("Treść wątku"), body);
    return inside;
  }

  it("creates a thread with the chosen type and criterion", async () => {
    serve();
    renderAt();
    const form = await fill("Polecam kurs", "Warto.");
    await userEvent.selectOptions(
      form.getByLabelText("Rodzaj wątku"),
      "recommendation",
    );
    await userEvent.selectOptions(
      form.getByLabelText("Kryterium (opcjonalnie)"),
      "komunikacja",
    );
    await userEvent.click(form.getByRole("button", { name: "Dodaj wątek" }));
    expect(mocks.create).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      kind: "recommendation",
      title: "Polecam kurs",
      body: "Warto.",
      criterionId: "komunikacja",
    });
  });

  it("rejects an empty title without calling the backend", async () => {
    serve();
    renderAt();
    const form = await fill("", "Treść");
    await userEvent.click(form.getByRole("button", { name: "Dodaj wątek" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wpisz tytuł.");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a body over the limit and shows the counter", async () => {
    serve();
    renderAt();
    const form = await fill("Tytuł", "");
    const area = form.getByLabelText("Treść wątku");
    await userEvent.click(area);
    await userEvent.paste("x".repeat(FORUM_LIMITS.body + 1));
    expect(
      screen.getByText(`${FORUM_LIMITS.body + 1}/${FORUM_LIMITS.body}`),
    ).toBeInTheDocument();
    await userEvent.click(form.getByRole("button", { name: "Dodaj wątek" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("najwyżej");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("shows the server's message when creating fails", async () => {
    serve();
    mocks.create.mockRejectedValue(new ConvexError("Brak uprawnień."));
    renderAt();
    const form = await fill("Tytuł", "Treść");
    await userEvent.click(form.getByRole("button", { name: "Dodaj wątek" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Brak uprawnień.",
    );
  });
});

describe("thread view", () => {
  it("renders the body as plain text and the replies", () => {
    serve();
    renderAt("/forum?watek=t1");
    expect(screen.getByText(/Treść <b>pogrubiona<\/b>/)).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
    expect(screen.getByText("Pierwsza odpowiedź")).toBeInTheDocument();
  });

  it("sends a reply and clears the field", async () => {
    serve();
    renderAt("/forum?watek=t1");
    const area = screen.getByLabelText("Twoja odpowiedź");
    await userEvent.type(area, "Dziękuję");
    await userEvent.click(
      screen.getByRole("button", { name: "Dodaj odpowiedź" }),
    );
    expect(mocks.reply).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      threadId: "t1",
      body: "Dziękuję",
    });
    expect(area).toHaveValue("");
  });

  it("rejects an empty reply", async () => {
    serve();
    renderAt("/forum?watek=t1");
    await userEvent.click(
      screen.getByRole("button", { name: "Dodaj odpowiedź" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wpisz treść odpowiedzi.",
    );
    expect(mocks.reply).not.toHaveBeenCalled();
  });

  it("reports the thread, and a repeated report does not break the view", async () => {
    serve();
    renderAt("/forum?watek=t1");
    const button = screen.getByRole("button", { name: "Zgłoś wątek" });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(mocks.report).toHaveBeenCalledTimes(2);
    expect(mocks.report).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      threadId: "t1",
    });
    expect(
      screen.getByRole("heading", { name: "Wątek 1" }),
    ).toBeInTheDocument();
  });

  it("shows a message for a missing thread and for a broken id", () => {
    serve(null);
    renderAt("/forum?watek=zly");
    expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono wątku");
  });

  it("does not crash when the thread query throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useQuery.mockImplementation(() => {
      throw new Error("bad id");
    });
    renderAt("/forum?watek=zly");
    expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono wątku");
    spy.mockRestore();
  });
});
