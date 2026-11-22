import { describe, expect, it } from "vitest";
import { plural } from "./plural";

const forms = { one: "dzień", few: "dni", many: "dni" };
const people = { one: "osoba", few: "osoby", many: "osób" };

describe("plural", () => {
  it.each([
    [1, "osoba"],
    [2, "osoby"],
    [5, "osób"],
    [12, "osób"],
    [22, "osoby"],
    [1000, "osób"],
    [0, "osób"],
  ])("picks the Polish form for %i", (n, expected) => {
    expect(plural(n, people)).toBe(expected);
  });

  it("returns the given forms verbatim", () => {
    expect(plural(1, forms)).toBe("dzień");
  });
});
