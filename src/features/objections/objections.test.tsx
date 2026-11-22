import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { ObjectionPanel } from "./ObjectionPanel";
import { ObjectionsPage } from "./ObjectionsPage";

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

const reviewId = "r1" as Id<"reviews">;

const baseInfo = {
  stage: "objection_window",
  round: 1,
  acknowledgedAt: "2026-11-02",
  filingDeadline: "2026-11-09",
  decisionDeadline: null,
  objection: null,
  courtAppealDays: null,
  can: { file: false, fileBlockedReason: null, decide: false },
};

function serve(data: Record<string, unknown>) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0], args: unknown) =>
      args === "skip" ? undefined : data[getFunctionName(fn)],
  );
}

const mutation = (name: string) => {
  const fn = mocks.mutations.get(name);
  if (!fn) throw new Error(`mutation ${name} was never used`);
  return fn;
};

const asRole = (role: string) =>
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");

beforeEach(() => {
  mocks.mutations.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  mocks.useQuery.mockReset();
});

describe("ObjectionPanel", () => {
  it("renders nothing while loading or when there is nothing to show", () => {
    serve({});
    const { container, rerender } = render(
      <ObjectionPanel reviewId={reviewId} />,
    );
    expect(container).toBeEmptyDOMElement();
    serve({ "objections/queries:forReview": baseInfo });
    rerender(<ObjectionPanel reviewId={reviewId} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lets the employee file an objection with the term shown", async () => {
    asRole("employee");
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        can: { file: true, fileBlockedReason: null, decide: false },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(screen.getByText(/do 2026-11-09/)).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Wnieś sprzeciw" });
    expect(send).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText("Uzasadnienie sprzeciwu"),
      "Ocena pomija wyniki.",
    );
    await userEvent.click(send);
    expect(mutation("objections/mutations:file")).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId,
      text: "Ocena pomija wyniki.",
    });
  });

  it("shows the Polish error when filing is refused", async () => {
    asRole("employee");
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        can: { file: true, fileBlockedReason: null, decide: false },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    mocks.mutations.set(
      "objections/mutations:file",
      vi.fn().mockRejectedValue(new ConvexError("Minął termin 7 dni.")),
    );
    await userEvent.type(screen.getByLabelText("Uzasadnienie sprzeciwu"), "x");
    await userEvent.click(
      screen.getByRole("button", { name: "Wnieś sprzeciw" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Minął termin 7 dni.",
    );
  });

  it("explains why filing is not possible", () => {
    asRole("employee");
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        can: {
          file: false,
          fileBlockedReason:
            "Minął termin 7 dni na wniesienie sprzeciwu (do 2026-11-09).",
          decide: false,
        },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(screen.getByText(/Minął termin 7 dni/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Wnieś sprzeciw" }),
    ).not.toBeInTheDocument();
  });

  it("shows a pending objection with the decision term", () => {
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        stage: "objection",
        decisionDeadline: "2026-11-16",
        objection: {
          filedAt: Date.UTC(2026, 10, 3),
          text: "Nie zgadzam się.",
          addressee: "Ewa Kowalczyk",
        },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(screen.getByText("Nie zgadzam się.")).toBeInTheDocument();
    expect(screen.getByText(/adresat: Ewa Kowalczyk/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "czeka na decyzję dyrektora generalnego, termin 2026-11-16",
    );
  });

  it("tells the employee about the labour court after a rejected objection", () => {
    asRole("employee");
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        stage: "closed",
        courtAppealDays: 14,
        objection: {
          filedAt: Date.UTC(2026, 10, 3),
          text: "Nie zgadzam się.",
          decision: "rejected",
          decidedAt: Date.UTC(2026, 10, 10),
        },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(screen.getByRole("status")).toHaveTextContent("nieuwzględniony");
    expect(
      screen.getByText(/odwołanie do sądu pracy w terminie 14 dni/),
    ).toBeInTheDocument();
  });

  it("marks an assessment drawn up for the second time", () => {
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        round: 2,
        can: { file: true, fileBlockedReason: null, decide: false },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(
      screen.getByText(/po raz drugi \(podejście 2\)/),
    ).toBeInTheDocument();
  });

  it("labels the earlier objection when a new one can be filed", () => {
    asRole("employee");
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        round: 2,
        objection: {
          filedAt: Date.UTC(2026, 10, 3),
          text: "Pierwszy sprzeciw.",
          decision: "redo",
        },
        can: { file: true, fileBlockedReason: null, decide: false },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(
      screen.getByText(/Poprzedni sprzeciw: wniesiono/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Wnieś sprzeciw" }),
    ).toBeDisabled();
  });

  it("gives the director the three decisions", async () => {
    asRole("director");
    serve({
      "objections/queries:forReview": {
        ...baseInfo,
        stage: "objection",
        objection: { filedAt: Date.UTC(2026, 10, 3), text: "Sprzeciw." },
        can: { file: false, fileBlockedReason: null, decide: true },
      },
    });
    render(<ObjectionPanel reviewId={reviewId} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    await userEvent.click(
      screen.getByRole("button", { name: "Nie uwzględniaj sprzeciwu" }),
    );
    expect(mutation("objections/mutations:decide")).toHaveBeenCalledWith({
      actor: { role: "director" },
      reviewId,
      decision: "rejected",
    });
  });
});

describe("ObjectionsPage", () => {
  const row = {
    reviewId,
    employeeName: "Anna Przykładowa",
    position: "Główny specjalista",
    round: 1,
    text: "Proszę o ponowną ocenę.",
    filedAt: Date.UTC(2026, 10, 3),
    decisionDeadline: "2026-11-16",
    overdue: false,
    unit: "Departament Prawny",
    evaluatorName: "Jerzy Malinowski",
    acknowledgedAt: "2026-11-02",
  };
  const renderPage = () =>
    render(
      <MemoryRouter>
        <ObjectionsPage />
      </MemoryRouter>,
    );

  it("shows an offline notice and sets the page title", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(document.title).toBe("Sprzeciwy");
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("tells other roles that the director decides and does not query", () => {
    online();
    asRole("supervisor");
    serve({});
    renderPage();
    expect(screen.getByText(/Wybierz w nagłówku rolę/)).toBeInTheDocument();
    expect(mocks.useQuery).toHaveBeenCalledWith(expect.anything(), "skip");
  });

  it("lists the objections with decision buttons for the director", async () => {
    online();
    asRole("director");
    serve({ "objections/queries:listForDirector": [row] });
    renderPage();
    expect(
      screen.getByRole("heading", {
        name: "Anna Przykładowa, Główny specjalista",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Proszę o ponowną ocenę.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zobacz ocenę: Anna Przykładowa" }),
    ).toHaveAttribute("href", "/oceny?ocena=r1");
    await userEvent.click(
      screen.getByRole("radio", { name: /Uchylam ocenę i zlecam nową/ }),
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /Uzasadnienie rozstrzygnięcia/ }),
      "Zasadny zarzut.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Zapisz rozstrzygnięcie/ }),
    );
    expect(mutation("objections/mutations:decide")).toHaveBeenCalledWith({
      actor: { role: "director" },
      reviewId,
      decision: "redo",
    });
  });

  it("shows HR the list without decision buttons and flags a late decision", () => {
    online();
    asRole("hr");
    serve({
      "objections/queries:listForDirector": [
        { ...row, overdue: true, round: 2 },
      ],
    });
    renderPage();
    expect(screen.getByText(/termin minął/)).toBeInTheDocument();
    expect(screen.getByText(/podejście 2/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Decyzję podejmuje dyrektor generalny/),
    ).toBeInTheDocument();
  });

  it("says so when there are no objections", () => {
    online();
    asRole("director");
    serve({ "objections/queries:listForDirector": [] });
    renderPage();
    expect(
      screen.getByText("Brak sprzeciwów do rozpatrzenia."),
    ).toBeInTheDocument();
  });
});
