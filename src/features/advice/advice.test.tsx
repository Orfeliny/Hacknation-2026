import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { adviceStore } from "../../lib/backend/demo/advice";
import { AdvicePage } from "./AdvicePage";

function renderPage() {
  return render(
    <MemoryRouter>
      <AdvicePage />
    </MemoryRouter>,
  );
}

afterEach(() => adviceStore.reset());

describe("AdvicePage", () => {
  it("shows a loading state, then the article list with reading time", async () => {
    renderPage();
    expect(screen.getByText("Wczytuję porady…")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Informacja zwrotna w trzech krokach",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 min czytania/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
  });

  it("shows the source, or the demo label when there is none", async () => {
    renderPage();
    const withSource = (
      await screen.findByRole("heading", {
        name: "Informacja zwrotna w trzech krokach",
      })
    ).closest("li") as HTMLElement;
    expect(
      within(withSource).getByText(/Źródło: docs\/materialy_md/),
    ).toBeInTheDocument();
    const withoutSource = screen
      .getByRole("heading", { name: "Obciążenie i dobrostan zespołu" })
      .closest("li") as HTMLElement;
    expect(
      within(withoutSource).getByText("Dane demonstracyjne"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dane demonstracyjne: widok/)).toBeInTheDocument();
  });

  it("filters by topic and marks the pressed button", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    const button = screen.getByRole("button", { name: "Docenianie" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByRole("heading", {
        name: "Docenianie codziennej pracy",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kryteria oceny w praktyce" }),
    ).not.toBeInTheDocument();
  });

  it("searches ignoring diacritics and shows an empty state", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    const box = screen.getByRole("searchbox", { name: "Szukaj w poradach" });
    await user.type(box, "obciazenie");
    expect(
      await screen.findByRole("heading", {
        name: "Obciążenie i dobrostan zespołu",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Docenianie codziennej pracy" }),
    ).not.toBeInTheDocument();
    await user.clear(box);
    await user.type(box, "zzzzzz");
    expect(
      await screen.findByText("Brak porad dla wybranego tematu i frazy."),
    ).toBeInTheDocument();
  });

  it("expands one article and renders sections as plain text", async () => {
    const user = userEvent.setup();
    adviceStore.set(
      adviceStore.get().map((a, i) =>
        i === 0
          ? {
              ...a,
              sections: [
                {
                  heading: "Sekcja",
                  paragraphs: ["<b>nie pogrubiaj</b>"],
                  bullets: ["punkt A"],
                },
              ],
            }
          : a,
      ),
    );
    renderPage();
    const toggle = await screen.findByRole("button", {
      name: "Czytaj dalej: Informacja zwrotna w trzech krokach",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      await screen.findByRole("heading", { name: "Sekcja", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText("<b>nie pogrubiaj</b>")).toBeInTheDocument();
    expect(screen.getByText("punkt A")).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });

  it("gives every button a unique accessible name", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Docenianie/ });
    const names = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "");
    expect(new Set(names).size).toBe(names.length);
  });
});
