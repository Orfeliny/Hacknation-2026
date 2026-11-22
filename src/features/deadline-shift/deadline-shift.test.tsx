import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoId } from "../../lib/backend/useDemo";
import { deadlineShiftStore } from "../../lib/backend/demo/deadlineShift";
import { formatDate } from "../../lib/format";
import { DeadlineShiftPage } from "./DeadlineShiftPage";
import { validateDecision } from "./schema";

const entry = (key: string) =>
  `/przesuniecie-terminu?ocena=${encodeURIComponent(demoId("reviews", key))}&zmiana=0`;

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <DeadlineShiftPage />
    </MemoryRouter>,
  );
}

beforeEach(() => deadlineShiftStore.reset());

describe("DeadlineShiftPage", () => {
  it("lists the supervisor's requests with demo data note and unique link names", async () => {
    renderAt("/przesuniecie-terminu");
    expect(await screen.findByText(/Joanna Mazur/)).toBeInTheDocument();
    expect(screen.getByText(/Dane demonstracyjne/)).toBeInTheDocument();
    const names = screen.getAllByRole("link").map((l) => l.textContent);
    expect(new Set(names).size).toBe(names.length);
    expect(screen.queryByText(/Anna Przykładowa/)).not.toBeInTheDocument();
  });

  it("opens an entry from the query and shows reason, dates and legal basis", async () => {
    renderAt(entry("mazur"));
    expect(
      await screen.findByText(/kończy się dopiero za trzy tygodnie/),
    ).toBeInTheDocument();
    expect(screen.getByText("Fakultatywne")).toBeInTheDocument();
    expect(
      screen.getByText(/art\. 81 ust\. 8; rozporządzenie/),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /art\. 81 ust\. 8 ustawy o służbie cywilnej/,
    });
    expect(link).toHaveAttribute("href", expect.stringContaining("isap.sejm"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows field errors and does not save an empty decision", async () => {
    const user = userEvent.setup();
    renderAt(entry("mazur"));
    await user.click(
      await screen.findByRole("button", {
        name: "Zapisz decyzję i przekaż do kadr",
      }),
    );
    expect(screen.getByText("Wybierz rozstrzygnięcie.")).toBeInTheDocument();
    expect(
      screen.getByText("Wpisz uzasadnienie, trafi do pisma."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Uzasadnienie/)).toBeInvalid();
    expect(deadlineShiftStore.get()[0]?.status).toBe("requested");
  });

  it("requires a new date after the current one when accepting", async () => {
    const user = userEvent.setup();
    renderAt(entry("mazur"));
    await user.click(await screen.findByLabelText("Uwzględniam wniosek"));
    const date = screen.getByLabelText("Nowy termin");
    expect(date).toHaveAttribute("placeholder", "dd.mm.rrrr");
    await user.clear(date);
    await user.type(screen.getByLabelText(/^Uzasadnienie/), "Zgoda.");
    await user.click(
      screen.getByRole("button", { name: "Zapisz decyzję i przekaż do kadr" }),
    );
    expect(screen.getByText("Podaj nowy termin.")).toBeInTheDocument();
  });

  it("saves an acceptance, says the date moves only after HR sends the letter, and goes read-only", async () => {
    const user = userEvent.setup();
    renderAt(entry("mazur"));
    await user.click(await screen.findByLabelText("Uwzględniam wniosek"));
    await user.type(screen.getByLabelText(/^Uzasadnienie/), "Zgoda.");
    await user.click(
      screen.getByRole("button", { name: "Zapisz decyzję i przekaż do kadr" }),
    );
    await waitFor(() =>
      expect(deadlineShiftStore.get()[0]?.status).toBe("approved"),
    );
    expect(
      await screen.findByText(/Termin zmieni się dopiero po wysłaniu pisma/, {
        selector: "div",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Zapisz decyzję i przekaż do kadr",
      }),
    ).not.toBeInTheDocument();
  });

  it("disables acceptance and explains the block in text when the shift is not allowed", async () => {
    renderAt(entry("wojcik"));
    const accept = await screen.findByLabelText("Uwzględniam wniosek");
    expect(accept).toBeDisabled();
    expect(
      screen.getByText(/nie może zostać przesunięty o więcej niż 6 miesięcy/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nie uwzględniam wniosku")).toBeEnabled();
  });

  it("shows a decided entry read-only", async () => {
    renderAt(entry("lewandowski"));
    expect(await screen.findByText(/Uwzględniony, nowy termin/)).toBeVisible();
    const panel = screen
      .getByRole("heading", { name: "Rozstrzygnięcie" })
      .closest("section")!;
    expect(
      within(panel).getByText(/Termin przesunięty o trzy tygodnie/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Uzasadnienie")).not.toBeInTheDocument();
  });

  it("tells the user when the entry does not exist", async () => {
    renderAt(
      `/przesuniecie-terminu?ocena=${demoId("reviews", "nie-ma")}&zmiana=3`,
    );
    expect(await screen.findByText(/Nie znaleziono wniosku/)).toBeVisible();
  });

  it("focuses the first invalid control after a failed submit", async () => {
    const user = userEvent.setup();
    renderAt(entry("mazur"));
    await user.click(
      await screen.findByRole("button", {
        name: "Zapisz decyzję i przekaż do kadr",
      }),
    );
    expect(screen.getByLabelText("Uwzględniam wniosek")).toHaveFocus();
  });

  it("ties the block reason to the disabled radio", async () => {
    renderAt(entry("wojcik"));
    const accept = await screen.findByLabelText("Uwzględniam wniosek");
    const reason = document.getElementById(
      accept.getAttribute("aria-describedby") ?? "",
    );
    expect(reason).toHaveTextContent(/więcej niż 6 miesięcy/);
  });

  it("sets the page title and a person line, and links back to the dashboard", async () => {
    renderAt(entry("mazur"));
    expect(
      await screen.findByText(/Joanna Mazur · .+ · wniosek z/),
    ).toBeVisible();
    expect(document.title).toBe("Wniosek o przesunięcie terminu — Azymut");
    expect(
      screen.getByRole("heading", { name: "Fakultatywne (ten ekran)" }),
    ).toBeVisible();
    expect(screen.getByText("Pisemna informacja dla pracownika")).toBeVisible();
  });

  it.each(["?ocena=abc&zmiana=0", "?ocena=abc&zmiana=x", "?zmiana=0"])(
    "renders the not-found card without errors for %s",
    async (query) => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      renderAt(`/przesuniecie-terminu${query}`);
      expect(await screen.findByText(/Nie znaleziono wniosku/)).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "Wnioski o przesunięcie" }),
      ).toBeVisible();
      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
    },
  );

  it("shows a single empty message when there are no requests", async () => {
    deadlineShiftStore.set([]);
    renderAt("/przesuniecie-terminu");
    expect(
      await screen.findByText("Brak wniosków o przesunięcie terminu."),
    ).toBeVisible();
    expect(
      screen.queryByText(/Wybierz wniosek z listy/),
    ).not.toBeInTheDocument();
  });

  it("formats dates with the shared helper", async () => {
    renderAt(entry("mazur"));
    const row = deadlineShiftStore.get()[0]!;
    expect(
      (await screen.findAllByText(new RegExp(formatDate(row.currentDueDate))))
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("validateDecision", () => {
  it("passes a rejection without a date", () => {
    expect(
      validateDecision(
        { accepted: "no", justification: " Nie. ", newDate: "" },
        "2026-12-01",
      ),
    ).toEqual({ ok: true, accepted: false, justification: "Nie." });
  });

  it("rejects an acceptance dated on or before the current deadline", () => {
    const result = validateDecision(
      { accepted: "yes", justification: "Tak", newDate: "2026-12-01" },
      "2026-12-01",
    );
    expect(result).toMatchObject({
      ok: false,
      errors: { newDate: "Nowy termin musi być późniejszy niż obecny." },
    });
  });
});
