import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccessibilityStatementPage } from "./AccessibilityStatementPage";
import feature from "./feature";
import { parseInline, parseStatement } from "./parseStatement";

describe("parseStatement", () => {
  it("parses headings, quotes, lists, paragraphs and inline marks", () => {
    const blocks = parseStatement(
      "# T\n\n> note\n\n## S\n\nline **one**\nline `two`\n\n- a\n- b\n",
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading",
      "quote",
      "heading",
      "paragraph",
      "list",
    ]);
    expect(blocks[4]).toMatchObject({
      items: [expect.any(Array), expect.any(Array)],
    });
    expect(parseInline("a **b** `c`")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "b" },
      { kind: "text", text: " " },
      { kind: "code", text: "c" },
    ]);
  });
});

describe("AccessibilityStatementPage", () => {
  it("renders the statement from docs/zgloszenie", () => {
    render(<AccessibilityStatementPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Deklaracja dostępności/ }),
    ).toBeInTheDocument();
    for (const name of [
      "Stan zgodności",
      "Zakres",
      "Sposób sprawdzenia",
      "Informacje zwrotne i kontakt",
      "Procedura odwoławcza",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText("częściowo zgodna")).toBeInTheDocument();
  });

  it("renders only the given source and never raw HTML", () => {
    render(<AccessibilityStatementPage source={"# X\n\nhi <b>there</b>"} />);
    expect(screen.getByText("hi <b>there</b>")).toBeInTheDocument();
  });

  it("registers a hidden-in-nav route", () => {
    expect(feature.path).toBe("/deklaracja-dostepnosci");
    expect(feature.hideInNav).toBe(true);
  });
});
