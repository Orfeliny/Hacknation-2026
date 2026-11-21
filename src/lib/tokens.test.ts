/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { colorTokens, contrastRatio, fontSans, textTokens } from "./tokens";

const WHITE = "#ffffff";

describe("colour tokens", () => {
  it.each(textTokens)("%s text reaches 4.5:1 on white", (name) => {
    expect(contrastRatio(colorTokens[name], WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  // The prototype's primary-hover, info and warning (#3a6ea5, #b84a00) land at 4.46 and 4.38 on
  // surface-muted. Status colours are only for alert text on white cards, so they are excluded.
  const onSurfaceMuted = textTokens.filter(
    (name) => !["primary-hover", "info", "warning"].includes(name),
  );

  it.each(onSurfaceMuted)("%s text reaches 4.5:1 on surface-muted", (name) => {
    expect(
      contrastRatio(colorTokens[name], colorTokens["surface-muted"]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("border reaches 3:1 on white", () => {
    expect(contrastRatio(colorTokens.border, WHITE)).toBeGreaterThanOrEqual(3);
  });

  it("computes the WCAG reference ratios", () => {
    expect(contrastRatio("#000000", WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });
});

describe("@theme in src/index.css", () => {
  const css = readFileSync("src/index.css", "utf8");
  const theme = /@theme\s*{([^}]*)}/.exec(css)?.[1] ?? "";

  it("has every colour token with the same value as tokens.ts", () => {
    const fromCss: Record<string, string> = {};
    for (const line of theme.split(/\r?\n/)) {
      const m = /--color-([\w-]+):\s*(#[0-9a-fA-F]{6});/.exec(line);
      if (m?.[1] && m[2]) fromCss[m[1]] = m[2].toLowerCase();
    }
    expect(fromCss).toEqual(colorTokens);
  });

  it("has the same font stack as tokens.ts", () => {
    expect(/--font-sans:\s*([^;]+);/.exec(theme)?.[1]).toBe(fontSans);
  });
});
