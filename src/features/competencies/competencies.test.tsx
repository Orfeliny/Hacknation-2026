import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { CompetenciesPage } from "./CompetenciesPage";

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

const levels = [
  { id: "1", label: "Poziom 1" },
  { id: "2", label: "Poziom 2" },
];
const model = {
  isDemo: true,
  levels,
  competencies: [
    {
      id: "rzetelnosc",
      name: "Rzetelność",
      indicators: [
        {
          id: "rzetelnosc-1",
          text: "Dotrzymuje terminów",
          levels: { 1: "rzadko", 2: "zawsze" },
        },
      ],
    },
  ],
};
const team = [{ _id: "e1", firstName: "Anna", lastName: "Nowak" }];
const assessment = {
  _id: "a1",
  competencyId: "rzetelnosc",
  status: "draft",
  finalLevel: null,
  modelOutdated: false,
  indicatorChoices: [],
  suggestion: null,
};

function serve(over: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    "competencies/queries:model": model,
    "employees/queries:team": team,
    "competencies/queries:listForEmployee": {
      can: { edit: true },
      assessments: [assessment],
    },
    "competencies/queries:get": { assessment, can: { edit: true } },
    ...over,
  };
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0]) => data[getFunctionName(fn)],
  );
}

beforeEach(() => {
  mocks.mutations.clear();
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "supervisor");
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  mocks.useQuery.mockReset();
});

async function pick() {
  await userEvent.selectOptions(screen.getByLabelText("Pracownik"), "e1");
  await userEvent.selectOptions(
    screen.getByLabelText("Kompetencja"),
    "rzetelnosc",
  );
}

describe("CompetenciesPage", () => {
  it("flags demo data and asks to pick a person and a competency", () => {
    serve();
    render(<CompetenciesPage />);
    expect(screen.getByText(/Dane demonstracyjne/)).toBeInTheDocument();
    expect(
      screen.getByText(/Wybierz pracownika i kompetencję/),
    ).toBeInTheDocument();
  });

  it("saves the chosen indicator level", async () => {
    serve();
    render(<CompetenciesPage />);
    await pick();
    await userEvent.selectOptions(
      screen.getByLabelText("Dotrzymuje terminów"),
      "2",
    );
    expect(
      mocks.mutations.get("competencies/mutations:saveChoices"),
    ).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      assessmentId: "a1",
      choices: [{ indicatorId: "rzetelnosc-1", levelId: "2" }],
    });
  });

  it("shows the suggestion steps and sends the final level with a justification", async () => {
    serve({
      "competencies/queries:get": {
        assessment: {
          ...assessment,
          suggestion: {
            levelId: "2",
            observed: 1,
            total: 1,
            required: 1,
            steps: ["Mediana to poziom 2."],
            notes: [],
          },
        },
        can: { edit: true },
      },
    });
    render(<CompetenciesPage />);
    await pick();
    expect(screen.getByText("Mediana to poziom 2.")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Poziom końcowy"), "1");
    await userEvent.type(
      screen.getByLabelText(/Uzasadnienie odstępstwa/),
      "Powód.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz poziom końcowy" }),
    );
    expect(
      mocks.mutations.get("competencies/mutations:setFinal"),
    ).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      assessmentId: "a1",
      finalLevel: "1",
      deviationJustification: "Powód.",
    });
  });

  it("offers to start an assessment that does not exist yet", async () => {
    serve({
      "competencies/queries:listForEmployee": {
        can: { edit: true },
        assessments: [],
      },
    });
    render(<CompetenciesPage />);
    await pick();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij ocenę kompetencji" }),
    );
    expect(
      mocks.mutations.get("competencies/mutations:open"),
    ).toHaveBeenCalledWith({
      actor: { role: "supervisor" },
      employeeId: "e1",
      competencyId: "rzetelnosc",
    });
  });
});
