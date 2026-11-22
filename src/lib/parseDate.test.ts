import { describe, expect, it } from "vitest";
import { parsePolishDate } from "./parseDate";

describe("parsePolishDate", () => {
  it("builds ISO from the parts", () => {
    expect(parsePolishDate("05.01.2026")).toBe("2026-01-05");
    expect(parsePolishDate("5.1.2026")).toBe("2026-01-05");
    expect(parsePolishDate("29.02.2028")).toBe("2028-02-29");
  });

  it("rejects impossible and malformed dates", () => {
    expect(parsePolishDate("31.02.2026")).toBeNull();
    expect(parsePolishDate("29.02.2026")).toBeNull();
    expect(parsePolishDate("2026-01-05")).toBeNull();
    expect(parsePolishDate("abc")).toBeNull();
  });
});
