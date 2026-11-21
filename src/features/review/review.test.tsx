import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ReviewWizard } from "./ReviewWizard";
import type { ReviewView, WizardActions } from "./types";

const criteria = [
  ["komunikacja", "Komunikacja", "mandatory"],
  ["kreatywnosc", "Kreatywność", "additional"],
  ["negocjowanie", "Negocjowanie", "additional"],
  ["sytuacje_kryzysowe", "Sytuacje kryzysowe", "additional"],
  ["myslenie_analityczne", "Myślenie analityczne", "additional"],
] as const;

function makeView(overrides: {
  review?: Record<string, unknown>;
  can?: Partial<ReviewView["can"]>;
  gaps?: ReviewView["gaps"];
}): ReviewView {
  return {
    review: {
      _id: "r1",
      stage: "opening",
      sheet: "C",
      additionalCriteria: ["kreatywnosc", "negocjowanie", "sytuacje_kryzysowe"],
      signatures: [],
      ...overrides.review,
    },
    employee: {
      firstName: "Anna",
      lastName: "Przykładowa",
      position: "Specjalista",
    },
    evaluator: { firstName: "Katarzyna", lastName: "Wiśniewska" },
    stageLabel: "Rozmowa rozpoczynająca",
    criteria: criteria.map(([id, name, kind]) => ({
      id,
      name,
      description: "",
      kind,
      expected: kind === "mandatory",
    })),
    scale: [{ id: "5", label: "na poziomie oczekiwań", value: 5 }],
    maxAdditional: 3,
    gaps: overrides.gaps ?? [],
    warnings: [],
    preview: null,
    daysLeft: null,
    can: {
      edit: true,
      advance: true,
      signPartOne: false,
      signAssessment: false,
      close: false,
      asEmployee: false,
      ...overrides.can,
    },
  } as unknown as ReviewView;
}

const actions = (over: Partial<WizardActions> = {}): WizardActions => ({
  save: vi.fn().mockResolvedValue(undefined),
  advance: vi.fn().mockResolvedValue(undefined),
  sign: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  ...over,
});

const renderWizard = (view: ReviewView, a = actions()) =>
  render(
    <MemoryRouter>
      <ReviewWizard view={view} actions={a} />
    </MemoryRouter>,
  );

describe("ReviewWizard", () => {
  it("lists formal gaps and links to AI modules and the print sheet", () => {
    renderWizard(
      makeView({
        gaps: [
          {
            code: "x",
            message: "Brak daty rozmowy rozpoczynającej.",
            source: "§ 7",
          },
        ],
      }),
    );
    expect(
      screen.getByText(/Brak daty rozmowy rozpoczynającej/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Przygotowanie do rozmów/ }),
    ).toHaveAttribute("href", "/rozmowy?ocena=r1");
    expect(
      screen.getByRole("link", { name: /Projekt treści/ }),
    ).toHaveAttribute("href", "/projekt?ocena=r1");
    expect(
      screen.getByRole("link", { name: /Wydruk arkusza/ }),
    ).toHaveAttribute("href", "/druk?ocena=r1");
  });

  it("tells done, current and upcoming steps apart without relying on color", () => {
    renderWizard(makeView({ review: { stage: "evaluation" } }));
    const steps = within(
      screen.getByRole("list", { name: "Kroki oceny" }),
    ).getAllByRole("listitem");
    expect(steps[0]).toHaveTextContent(
      "1. Rozmowa rozpoczynająca (zakończony)",
    );
    expect(steps[2]).toHaveAttribute("aria-current", "step");
    expect(steps[2]).not.toHaveTextContent(/zakończony|do zrobienia/);
    expect(steps[5]).toHaveTextContent(
      "6. Zapoznanie i sprzeciw (do zrobienia)",
    );
  });

  it("keeps the last step current while an objection is decided", () => {
    renderWizard(makeView({ review: { stage: "objection" } }));
    const steps = within(
      screen.getByRole("list", { name: "Kroki oceny" }),
    ).getAllByRole("listitem");
    expect(steps[5]).toHaveAttribute("aria-current", "step");
    expect(steps[4]).toHaveTextContent("(zakończony)");
    expect(screen.getByText(/Oceniany wniósł sprzeciw/)).toBeInTheDocument();
  });

  it("disables a fourth additional criterion", () => {
    renderWizard(makeView({}));
    expect(screen.getByText(/Kryteria dodatkowe \(3\/3\)/)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Myślenie analityczne" }),
    ).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Kreatywność" })).toBeEnabled();
  });

  it("shows the employee a read-only review they can confirm", async () => {
    const a = actions();
    renderWizard(
      makeView({
        can: {
          edit: false,
          advance: false,
          signPartOne: true,
          asEmployee: true,
        },
      }),
      a,
    );
    expect(screen.getByText(/nie edytować/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Zapisz" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Data rozmowy rozpoczynającej"),
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Potwierdzam" }));
    expect(a.sign).toHaveBeenCalledWith("part_one", "Warszawa");
  });

  it("saves before advancing while part I is not signed", async () => {
    const a = actions();
    renderWizard(makeView({}), a);
    await userEvent.click(
      screen.getByRole("button", { name: /przejdź do okresu oceny/ }),
    );
    expect(a.save).toHaveBeenCalledTimes(1);
    expect(a.advance).toHaveBeenCalledTimes(1);
  });

  it("only advances, without saving locked fields, once part I is signed", async () => {
    const a = actions();
    renderWizard(
      makeView({
        review: {
          signatures: [
            { role: "evaluator", scope: "part_one", signedAt: 1, place: "W" },
          ],
        },
      }),
      a,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /przejdź do okresu oceny/ }),
    );
    expect(a.save).not.toHaveBeenCalled();
    expect(a.advance).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(a.save).not.toHaveBeenCalled();
  });

  it("shows the Polish gap list returned by the backend when advancing fails", async () => {
    const a = actions({
      advance: vi.fn().mockRejectedValue(new ConvexError("Brak daty rozmowy.")),
    });
    renderWizard(makeView({}), a);
    await userEvent.click(
      screen.getByRole("button", { name: /przejdź do okresu oceny/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Brak daty rozmowy.",
    );
  });
});
