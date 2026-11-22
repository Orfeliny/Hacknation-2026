import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { filingDeadlineIfAcknowledgedOn } from "./deadlines";
import { EmployeeResultPage } from "./EmployeeResultPage";
import feature from "./feature";

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

const reviewId = "r1";

const me = {
  _id: reviewId,
  stage: "objection_window",
  sheet: "C",
  periodStart: "2024-11-01",
  periodEnd: "2026-10-31",
  evaluatorName: "Marta Zielińska",
  assessment: {
    ratings: [
      { criterionId: "rzetelnosc", levelId: "7", justification: null },
      { criterionId: "komunikacja", levelId: "3", justification: "Brak." },
    ],
    averageScore: 5.57,
    overallResult: "positive",
    overallLevelId: "na_poziomie_oczekiwan",
    overallJustification: null,
    developmentPlan: null,
  },
};
const full = { can: { signAssessment: false } };
const info = {
  stage: "objection_window",
  round: 1,
  acknowledgedAt: "2026-11-17",
  filingDeadline: "2026-11-24",
  decisionDeadline: null,
  objection: null,
  courtAppealDays: null,
  can: { file: true, fileBlockedReason: null, decide: false },
};

function serve(data: Record<string, unknown>) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0], args: unknown) =>
      args === "skip" ? undefined : data[getFunctionName(fn)],
  );
}

const served = (over: Record<string, unknown> = {}) =>
  serve({
    "me/queries:get": me,
    "reviews/queries:get": full,
    "objections/queries:forReview": info,
    ...over,
  });

const mutation = (name: string) => {
  const fn = mocks.mutations.get(name);
  if (!fn) throw new Error(`mutation ${name} was never used`);
  return fn;
};

const renderPage = (url = "/wynik-oceny?ocena=r1") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <EmployeeResultPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  mocks.mutations.clear();
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "employee");
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  mocks.useQuery.mockReset();
});

describe("EmployeeResultPage", () => {
  it("registers /wynik-oceny for employees only, outside the nav", () => {
    expect(feature).toMatchObject({
      path: "/wynik-oceny",
      roles: ["employee"],
      hideInNav: true,
    });
  });

  it("shows an offline state without querying the backend", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_CONVEX_URL", "");
    renderPage();
    expect(screen.getByText(/Tryb offline/)).toBeInTheDocument();
    expect(mocks.useQuery).not.toHaveBeenCalled();
  });

  it("asks other roles to switch to the employee role", () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "supervisor");
    renderPage();
    expect(screen.getByText(/Ten widok jest dla roli/)).toBeInTheDocument();
  });

  it("shows the result, the deadline from the rules and the way back", () => {
    served();
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Wynik" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5,57")).toBeInTheDocument();
    expect(screen.getByText(/Komunikacja/)).toBeInTheDocument();
    expect(screen.getByText(/Uzasadnienie:/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`w ciągu ${RULES_2016.objectionDays} dni`)),
    ).toHaveTextContent("24.11.2026");
    expect(
      screen.getByRole("link", { name: "Wróć do mojej oceny" }),
    ).toHaveAttribute("href", "/moja-ocena");
  });

  it("has no repeated accessible names for buttons and links", () => {
    served();
    renderPage();
    const names = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("link"),
    ].map((el) => el.textContent);
    expect(new Set(names).size).toBe(names.length);
  });

  it("acknowledges through reviews.sign and previews the deadline from the rules", async () => {
    served({ "reviews/queries:get": { can: { signAssessment: true } } });
    renderPage();
    expect(
      screen.getByText(
        new RegExp(
          filingDeadlineIfAcknowledgedOn(new Date())
            .split("-")
            .reverse()
            .join("\\."),
        ),
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Potwierdź zapoznanie z oceną" }),
    );
    expect(mutation("reviews/mutations:sign")).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId,
      scope: "assessment",
      place: "Warszawa",
    });
  });

  it("explains that the evaluator has to sign first", () => {
    served({
      "me/queries:get": { ...me, stage: "signing" },
      "objections/queries:forReview": {
        ...info,
        acknowledgedAt: null,
        filingDeadline: null,
        can: { file: false, fileBlockedReason: null, decide: false },
      },
    });
    renderPage();
    expect(
      screen.getByText(/Oceniający jeszcze nie podpisał oceny/),
    ).toBeInTheDocument();
  });

  it("files an objection with the typed justification", async () => {
    served();
    renderPage();
    const submit = screen.getByRole("button", { name: "Złóż sprzeciw" });
    expect(submit).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText("Uzasadnienie sprzeciwu"),
      "Nie zgadzam się.",
    );
    await userEvent.click(submit);
    expect(mutation("objections/mutations:file")).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId,
      text: "Nie zgadzam się.",
    });
  });

  it("shows a filed objection waiting for the decision and hides the form", () => {
    served({
      "objections/queries:forReview": {
        ...info,
        stage: "objection",
        decisionDeadline: "2026-12-08",
        objection: {
          filedAt: Date.parse("2026-11-20T10:00:00"),
          text: "Za niska ocena.",
          addressee: "Ewa Kowalczyk",
        },
        can: { file: false, fileBlockedReason: null, decide: false },
      },
    });
    renderPage();
    expect(screen.getByText(/czeka na decyzję dyrektora/)).toHaveTextContent(
      "08.12.2026",
    );
    expect(
      screen.queryByRole("button", { name: "Złóż sprzeciw" }),
    ).not.toBeInTheDocument();
  });

  it("shows the court appeal term after a rejection", () => {
    served({
      "objections/queries:forReview": {
        ...info,
        stage: "closed",
        courtAppealDays: 14,
        objection: {
          filedAt: Date.parse("2026-11-20T10:00:00"),
          text: "x",
          decision: "rejected",
          decidedAt: Date.parse("2026-11-25T10:00:00"),
        },
        can: { file: false, fileBlockedReason: null, decide: false },
      },
    });
    renderPage();
    expect(screen.getByText(/odwołanie do sądu pracy/)).toHaveTextContent(
      "14 dni",
    );
    expect(screen.getByText(/Rozstrzygnięcie: nieuwzględniony/)).toBeVisible();
  });

  it("picks the latest assessed review when no ocena is given", () => {
    served({
      "me/queries:list": [
        { _id: "r0", stage: "observation" },
        { _id: "r1", stage: "objection_window" },
      ],
    });
    renderPage("/wynik-oceny");
    expect(
      screen.getByRole("heading", { level: 2, name: "Wynik" }),
    ).toBeInTheDocument();
  });

  it("says so when there is no assessment to acknowledge", () => {
    served({ "me/queries:list": [{ _id: "r0", stage: "observation" }] });
    renderPage("/wynik-oceny");
    expect(screen.getByText(/Nie masz jeszcze oceny/)).toBeInTheDocument();
  });
});
