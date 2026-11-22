import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { describe, expect, it, vi } from "vitest";
import { FirstReviewWizard } from "./FirstReviewWizard";
import type { FirstReviewActions, FirstReviewView } from "./types";

function makeView(overrides: Partial<FirstReviewView> = {}): FirstReviewView {
  return {
    _id: "f1",
    employeeName: "Michał Wójcik",
    position: "Inspektor",
    stage: "report",
    stageLabel: "Sprawozdanie pracownika",
    startDate: "2026-09-01",
    dueDate: null,
    window: {
      earliest: "2027-05-01",
      latest: undefined,
      source: "Ustawa o służbie cywilnej, art. 38 ust. 1",
    },
    warning: "Przed 2027-05-01: za wcześnie.",
    result: null,
    effect: null,
    elements: [
      {
        id: "report",
        label: "Sprawozdanie pracownika",
        source: "Ustawa o służbie cywilnej, art. 38 ust. 2 pkt 3",
      },
      {
        id: "unit_head",
        label: "Ocena w porozumieniu z kierującym komórką",
        source: "Ustawa o służbie cywilnej, art. 38 ust. 2",
      },
    ],
    effectsSource: "art. 38 ust. 3",
    signatures: [],
    you: {
      isEvaluator: true,
      isReviewed: false,
      canRecordForEmployee: false,
      evaluatorSigned: false,
      employeeSigned: false,
    },
    ...overrides,
  } as FirstReviewView;
}

function makeActions(): FirstReviewActions {
  return {
    confirmReport: vi.fn().mockResolvedValue(undefined),
    conclude: vi.fn().mockResolvedValue(undefined),
    sign: vi.fn().mockResolvedValue(undefined),
  };
}

describe("FirstReviewWizard", () => {
  it("shows the window with its legal basis and the timing warning", () => {
    render(<FirstReviewWizard view={makeView()} actions={makeActions()} />);
    expect(screen.getByText("01.05.2027")).toBeInTheDocument();
    expect(screen.queryByText("2027-05-01")).not.toBeInTheDocument();
    expect(screen.getByText(/art\. 38 ust\. 1/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("za wcześnie");
    expect(screen.getByText(/art\. 38 ust\. 2 pkt 3/)).toBeInTheDocument();
  });

  it("marks finished stages with a check and the current one", () => {
    render(
      <FirstReviewWizard
        view={makeView({ stage: "signing" })}
        actions={makeActions()}
      />,
    );
    const steps = screen.getAllByRole("listitem");
    expect(steps[2]).toHaveAttribute("aria-current", "step");
    expect(steps[0]).toHaveTextContent("(zakończony)");
    expect(steps[3]).not.toHaveTextContent("(zakończony)");
  });

  it("shows a window without an end date and the report heading", () => {
    render(<FirstReviewWizard view={makeView()} actions={makeActions()} />);
    expect(screen.queryByText(/najpóźniej/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Wymagane: Sprawozdanie/ }),
    ).toBeInTheDocument();
  });

  it("needs the report confirmation before moving on", async () => {
    const actions = makeActions();
    render(<FirstReviewWizard view={makeView()} actions={actions} />);
    const go = screen.getByRole("button", { name: "Przejdź do oceny" });
    expect(go).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Otrzymałem sprawozdanie/));
    await userEvent.click(go);
    expect(actions.confirmReport).toHaveBeenCalledOnce();
  });

  it("sends the result with the unit head confirmation", async () => {
    const actions = makeActions();
    render(
      <FirstReviewWizard
        view={makeView({ stage: "assessment" })}
        actions={actions}
      />,
    );
    await userEvent.click(screen.getByLabelText("Ocena negatywna"));
    await userEvent.click(screen.getByLabelText(/porozumieniu/));
    await userEvent.click(screen.getByRole("button", { name: /Zapisz wynik/ }));
    expect(actions.conclude).toHaveBeenCalledWith("negative", true);
  });

  it("lets HR record the employee's signature on their behalf, after the evaluator", async () => {
    const actions = makeActions();
    render(
      <FirstReviewWizard
        view={makeView({
          stage: "signing",
          you: {
            isEvaluator: false,
            isReviewed: false,
            canRecordForEmployee: true,
            evaluatorSigned: true,
            employeeSigned: false,
          },
        })}
        actions={actions}
      />,
    );
    await userEvent.type(screen.getByLabelText("Miejscowość"), "Warszawa");
    await userEvent.click(
      screen.getByRole("button", { name: /w jego imieniu/ }),
    );
    expect(actions.sign).toHaveBeenCalledWith("employee", "Warszawa");
  });

  it("shows the effect of the result with its basis once concluded", () => {
    render(
      <FirstReviewWizard
        view={makeView({
          stage: "closed",
          result: "positive",
          effect: {
            label: "Wniosek o umowę na czas nieokreślony.",
            source: "art. 38 ust. 3 pkt 1",
          },
        })}
        actions={makeActions()}
      />,
    );
    expect(screen.getByText("pozytywny")).toBeInTheDocument();
    expect(screen.getByText(/art\. 38 ust\. 3 pkt 1/)).toBeInTheDocument();
  });

  it("shows the server message when a step fails", async () => {
    const actions = makeActions();
    actions.confirmReport = vi
      .fn()
      .mockRejectedValue(new ConvexError("Brak uprawnień."));
    render(<FirstReviewWizard view={makeView()} actions={actions} />);
    await userEvent.click(screen.getByLabelText(/Otrzymałem sprawozdanie/));
    await userEvent.click(
      screen.getByRole("button", { name: "Przejdź do oceny" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Brak uprawnień.",
    );
  });
});
