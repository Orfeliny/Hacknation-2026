import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { EmployeeResultPage } from "./EmployeeResultPage";

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
  dueDate: "2026-11-30",
  expectations: [],
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
    "me/queries:list": [{ _id: reviewId, stage: "objection_window" }],
    "me/queries:selfNotes": [],
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
  it("shows the result, the rules-based deadline and the way back, and files an objection", async () => {
    served();
    renderPage();
    expect(screen.getByText("5,57")).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`w ciągu ${RULES_2016.objectionDays} dni`)),
    ).toHaveTextContent("24.11.2026");
    expect(screen.getByRole("link", { name: "Moja ocena" })).toHaveAttribute(
      "href",
      "/moja-ocena",
    );
    await userEvent.type(
      screen.getByLabelText("Uzasadnienie sprzeciwu"),
      "Nie zgadzam się.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Złóż sprzeciw" }),
    );
    expect(mutation("objections/mutations:file")).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId,
      text: "Nie zgadzam się.",
    });
  });
});
