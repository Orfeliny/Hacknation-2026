import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { colorTokens, contrastRatio } from "../../lib/tokens";
import feature from "./feature";
import { formatRatio } from "./content";
import { StyleGuidePage } from "./StyleGuidePage";

describe("StyleGuidePage", () => {
  it("renders principles, the stage order and the glossary", () => {
    render(<StyleGuidePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Zasady i paleta" }),
    ).toBeInTheDocument();
    const stages = within(
      screen.getByRole("region", {
        name: "Etapy oceny, zawsze w tej kolejności",
      }),
    ).getAllByRole("listitem");
    expect(stages.map((li) => li.textContent)).toEqual([
      "Kryteria",
      "Rozmowa rozpoczynająca",
      "Obserwacja",
      "Rozmowa oceniająca",
      "Sporządzenie",
      "Zapoznanie",
      "Sprzeciw",
      "Zamknięta",
    ]);
    expect(screen.getByText("Obserwacje")).toBeInTheDocument();
    expect(screen.getByText("Najpierw termin.")).toBeInTheDocument();
  });

  it("shows contrast values computed from the tokens", () => {
    render(<StyleGuidePage />);
    const palette = screen.getByRole("region", { name: "Paleta" });
    const steel = formatRatio(contrastRatio(colorTokens.primary, "#ffffff"));
    expect(within(palette).getByText(`na białym ${steel}`)).toBeInTheDocument();
    expect(steel).toMatch(/^\d+,\d{2}:1$/);
    for (const hex of Object.values(colorTokens)) {
      const states = screen.getByRole("region", { name: "Kolory stanu" });
      const all = palette.textContent + (states.textContent ?? "");
      if (["#b42318", "#b84a00", "#3a6ea5", "#1e6b3a"].includes(hex)) {
        expect(all).toContain(hex.toUpperCase());
      }
    }
  });

  it("floors the ratio so it never overstates contrast", () => {
    expect(formatRatio(4.499)).toBe("4,49:1");
    expect(formatRatio(21)).toBe("21,00:1");
  });

  it("registers a hidden-in-nav route", () => {
    expect(feature.path).toBe("/zasady");
    expect(feature.hideInNav).toBe(true);
  });
});
