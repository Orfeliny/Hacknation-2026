import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forumStore } from "../../lib/backend/demo/forum";
import { setDemoRole } from "../../lib/demoRole";
import { ModerationPage } from "./ModerationPage";

const mocks = vi.hoisted(() => ({ failHide: false }));

vi.mock("../../lib/backend/forum", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/backend/forum")>();
  return {
    ...actual,
    useHideThread: () => {
      const real = actual.useHideThread();
      return (args: Parameters<typeof real>[0]) =>
        mocks.failHide
          ? Promise.reject(
              new ConvexError({
                code: "denied",
                message: "Nie masz uprawnień do tej akcji.",
              }),
            )
          : real(args);
    },
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ModerationPage />
    </MemoryRouter>,
  );
}

const SPAM = "Świetna oferta, kliknij tutaj";

beforeEach(() => {
  window.localStorage.clear();
  mocks.failHide = false;
  forumStore.reset();
  setDemoRole("hr");
});

describe("ModerationPage", () => {
  it("lists the reported thread with its report date and the actions", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: SPAM }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Zgłoszony/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Ukryj: ${SPAM}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Odrzuć zgłoszenie: ${SPAM}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `Zobacz wątek: ${SPAM}` }),
    ).toHaveAttribute("href", expect.stringContaining("/forum?watek="));
  });

  it("hides a thread, then restores it", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: `Ukryj: ${SPAM}` }),
    );
    expect(
      await screen.findByRole("button", { name: `Przywróć: ${SPAM}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Ukryty [0-9]/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Ukryj: ${SPAM}` })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      `Ukryto wątek: ${SPAM}`,
    );
    expect(screen.getByRole("status")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: `Przywróć: ${SPAM}` }));
    expect(
      await screen.findByRole("button", { name: `Ukryj: ${SPAM}` }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Ukryty [0-9]/)).toBeNull();
  });

  it("dismisses a report and shows the empty state", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", {
        name: `Odrzuć zgłoszenie: ${SPAM}`,
      }),
    );
    expect(
      await screen.findByText("Brak zgłoszonych i ukrytych wątków."),
    ).toBeInTheDocument();
  });

  it("gives every action a unique accessible name when there are several threads", async () => {
    act(() => {
      const state = forumStore.get();
      forumStore.set({
        ...state,
        threads: state.threads.map((t) =>
          t.threadId.endsWith("mentor")
            ? { ...t, reported: true, reportedAt: Date.now() }
            : t,
        ),
      });
    });
    renderPage();
    await screen.findByRole("heading", { name: SPAM });
    const names = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((n) => n?.startsWith("Ukryj:"))).toHaveLength(2);
    for (const button of screen.getAllByRole("button")) {
      const label = button.getAttribute("aria-label");
      expect(label, button.textContent ?? "").toContain(
        button.textContent ?? "",
      );
    }
  });

  it("lists threads oldest report first and shows both badges for a reported and hidden thread", async () => {
    act(() => {
      const state = forumStore.get();
      forumStore.set({
        ...state,
        threads: state.threads.map((t) =>
          t.threadId.endsWith("mentor")
            ? { ...t, reported: true, reportedAt: 1_000, hiddenAt: 2_000 }
            : t,
        ),
      });
    });
    renderPage();
    await screen.findByRole("heading", { name: SPAM });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Mogę podzielić się doświadczeniem z kontroli planowych", SPAM]);
    const first = screen.getAllByRole("listitem")[0] as HTMLElement;
    expect(within(first).getByText(/^Zgłoszony/)).toBeInTheDocument();
    expect(within(first).getByText(/^Ukryty/)).toBeInTheDocument();
  });

  it("shows the error of a failed action and keeps the thread", async () => {
    mocks.failHide = true;
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: `Ukryj: ${SPAM}` }),
    );
    expect(
      await screen.findByText("Nie masz uprawnień do tej akcji."),
    ).toBeInTheDocument();
    const row = screen.getByRole("heading", { name: SPAM }).closest("li");
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByText("Nie masz uprawnień do tej akcji."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Ukryj: ${SPAM}` }),
    ).toBeEnabled();
  });

  it("tells a role other than hr that the view is for HR only", () => {
    setDemoRole("supervisor");
    renderPage();
    expect(
      within(document.body).getByText(
        "Moderacja forum jest dostępna dla kadr.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ukryj/ })).toBeNull();
  });

  it("swaps the queue for the note when the role changes while the page is open", async () => {
    renderPage();
    await screen.findByRole("heading", { name: SPAM });
    act(() => setDemoRole("employee"));
    expect(
      await screen.findByText("Moderacja forum jest dostępna dla kadr."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: SPAM })).toBeNull();
  });
});
