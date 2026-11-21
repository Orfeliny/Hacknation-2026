import { describe, expect, it } from "vitest";
import { PLACEHOLDER, pseudonymize, restore } from "./pseudonymize";

const joanna = { firstName: "Joanna", lastName: "Mazur" };
const adam = { firstName: "Adam", lastName: "Kowal" };

describe("pseudonymize", () => {
  it("replaces a full name in either order with one placeholder", () => {
    expect(pseudonymize("Joanna Mazur i Mazur Joanna", [joanna])).toBe(
      `${PLACEHOLDER} i ${PLACEHOLDER}`,
    );
  });

  it("replaces a first or last name that stands alone, ignoring case", () => {
    expect(pseudonymize("Rozmawiałem z JOANNA oraz mazur.", [joanna])).toBe(
      `Rozmawiałem z ${PLACEHOLDER} oraz ${PLACEHOLDER}.`,
    );
  });

  it("does not touch longer words that merely contain a name", () => {
    expect(pseudonymize("Mazurek i Kowalski", [joanna, adam])).toBe(
      "Mazurek i Kowalski",
    );
  });

  it("covers every given person", () => {
    expect(pseudonymize("Adam Kowal pomaga Joanna Mazur", [joanna, adam])).toBe(
      `${PLACEHOLDER} pomaga ${PLACEHOLDER}`,
    );
  });

  it("keeps very short names out of the single-word pass", () => {
    const short = { firstName: "Al", lastName: "Li" };
    expect(pseudonymize("Al wszedł do alei", [short])).toBe(
      "Al wszedł do alei",
    );
    expect(pseudonymize("Al Li wszedł", [short])).toBe(`${PLACEHOLDER} wszedł`);
  });

  it("escapes characters that mean something in a pattern", () => {
    const odd = { firstName: "A.B", lastName: "C+D" };
    expect(pseudonymize("A.B C+D oraz AXB", [odd])).toBe(
      `${PLACEHOLDER} oraz AXB`,
    );
  });

  it("is a no-op without people", () => {
    expect(pseudonymize("Joanna Mazur", [])).toBe("Joanna Mazur");
  });
});

describe("restore", () => {
  it("puts the name of the one employee back in every place", () => {
    expect(
      restore(`${PLACEHOLDER} pracuje. Zapytaj ${PLACEHOLDER}.`, joanna),
    ).toBe("Joanna Mazur pracuje. Zapytaj Joanna Mazur.");
  });

  it("leaves text without a placeholder alone", () => {
    expect(restore("bez znacznika", joanna)).toBe("bez znacznika");
  });
});
