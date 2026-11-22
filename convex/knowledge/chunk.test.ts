import { describe, expect, it } from "vitest";
import { MAX_EMBED_TEXT_CHARS } from "../ai/types";
import { chunkMarkdown, MAX_CHUNK_BODY } from "./chunk";

const ACT = `# Rozporządzenie w sprawie oceny

Preambuła aktu.

## Rozdział 1 Przepisy ogólne

### § 1.

#### 1\\.

Rozporządzenie określa tryb oceny.

#### 2\\.

Ocena jest wystawiana raz na dwa lata.

### § 2.

Ocenę przeprowadza przełożony.

## Rozdział 2 Tryb

### § 3.

Wniosek składa się na piśmie.
`;

describe("chunkMarkdown", () => {
  const chunks = chunkMarkdown(ACT, "Rozporządzenie o ocenie");

  it("cuts by paragraph sign and keeps the heading path as the locator", () => {
    expect(chunks.map((c) => c.locator)).toEqual([
      "Początek dokumentu",
      "Rozdział 1 Przepisy ogólne > § 1.",
      "Rozdział 1 Przepisy ogólne > § 2.",
      "Rozdział 2 Tryb > § 3.",
    ]);
  });

  it("merges numbered points into their unit and prefixes the title", () => {
    const first = chunks[1];
    expect(first?.text.startsWith("Rozporządzenie o ocenie\n")).toBe(true);
    expect(first?.text).toContain("1.\n\nRozporządzenie określa tryb oceny.");
    expect(first?.text).toContain("Ocena jest wystawiana raz na dwa lata.");
  });

  it("numbers chunks in order", () => {
    expect(chunks.map((c) => c.order)).toEqual([0, 1, 2, 3]);
  });

  it("splits a long article into parts under the size limit", () => {
    const sentence = "To jest zdanie o ocenie okresowej pracownika. ";
    const body = sentence.repeat(120);
    const parts = chunkMarkdown(`## Art. 5.\n\n${body}`, "Ustawa");
    expect(parts.length).toBeGreaterThan(3);
    expect(parts[0]?.locator).toMatch(/^Art\. 5\. \(cz\. 1\/\d+\)$/);
    for (const part of parts) {
      expect(part.text.length).toBeLessThanOrEqual(MAX_CHUNK_BODY + 200);
      expect(part.text.length).toBeLessThanOrEqual(MAX_EMBED_TEXT_CHARS);
    }
  });

  it("cuts a text without articles by headings and survives no headings", () => {
    const page = chunkMarkdown(
      "# Ocena\n\nTekst A\n\n## Terminy\n\nTekst B",
      "Strona",
    );
    expect(page.map((c) => c.locator)).toEqual(["Ocena", "Ocena > Terminy"]);
    expect(chunkMarkdown("Sam tekst.", "Plik")).toHaveLength(1);
    expect(chunkMarkdown("", "Plik")).toEqual([]);
  });

  it("hard-cuts text with no sentence breaks", () => {
    const parts = chunkMarkdown("x".repeat(3000), "Plik");
    expect(parts.length).toBe(3);
  });
});

describe("chunkMarkdown on an ELI act", () => {
  const ELI = `# Ustawaz dnia 1 stycznia 2020 r.o ocenach [1)Przypis o zmienianych ustawach.](#gloss-0:1:)

## Spis treści

-   [Treść ustawy](#part_1)
    -   [Art. 1.](#art_1)

## Treść ustawy

###

   Rozdział 1

**Przepisy ogólne**

### **Art. 1.**

#### § 1.

Ocena jest wystawiana raz na dwa lata.

#### § 2.

Ocenę przeprowadza przełożony.

### **Art. 2.**

#### 1)

Termin wynosi 14 dni.
`;
  const chunks = chunkMarkdown(ELI, "Ustawa o ocenach");

  it("keeps the article when the paragraph signs inside it are headings", () => {
    expect(chunks.map((c) => c.locator)).toEqual([
      "Początek dokumentu",
      "Art. 1.",
      "Art. 2.",
    ]);
    expect(chunks[1]?.text).toContain("§ 1.");
    expect(chunks[1]?.text).toContain("Ocenę przeprowadza przełożony.");
  });

  it("drops the table of contents, empty headings and the act title from the path", () => {
    for (const chunk of chunks) {
      expect(chunk.text).not.toContain("Spis treści");
      expect(chunk.text).not.toContain("Przypis o zmienianych");
      expect(chunk.locator).not.toContain("Treść ustawy");
      expect(chunk.locator).not.toContain(">");
    }
  });

  it("treats a paragraph sign as the unit in an act without articles", () => {
    const regulation = chunkMarkdown("## § 1.\n\nA.\n\n## § 2.\n\nB.", "Rozp.");
    expect(regulation.map((c) => c.locator)).toEqual(["§ 1.", "§ 2."]);
  });
});
