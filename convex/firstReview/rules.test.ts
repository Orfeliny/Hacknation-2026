import { describe, expect, it } from "vitest";
import {
  FIRST_REVIEW_RULES,
  computeFirstReviewWindow,
  timingWarning,
} from "./rules";

describe("first review rules", () => {
  it("opens 8 months after the employment starts, with the legal basis", () => {
    const w = computeFirstReviewWindow("2026-09-01");
    expect(w.earliest).toBe("2027-05-01");
    expect(w.latest).toBeUndefined();
    expect(w.source).toContain("art. 38 ust. 1");
  });

  it("closes one month before the contract ends", () => {
    const w = computeFirstReviewWindow("2026-09-01", "2027-09-30");
    expect(w.latest).toBe("2027-08-30");
  });

  it("clips the end of a shorter month", () => {
    expect(computeFirstReviewWindow("2026-01-31").earliest).toBe("2026-09-30");
  });

  it("rejects a contract that ends before the window opens", () => {
    expect(() => computeFirstReviewWindow("2026-09-01", "2027-02-01")).toThrow(
      "za wcześnie",
    );
  });

  it("warns before the window and after it, never inside", () => {
    const w = computeFirstReviewWindow("2026-09-01", "2027-09-30");
    expect(timingWarning("2026-11-21", w)).toContain("najwcześniej");
    expect(timingWarning("2027-06-01", w)).toBeUndefined();
    expect(timingWarning("2027-09-01", w)).toContain("minął");
  });

  it("cites a legal basis for every element and effect", () => {
    for (const e of FIRST_REVIEW_RULES.elements)
      expect(e.source).toMatch(/art\. 38/);
    expect(FIRST_REVIEW_RULES.effects.positive.source).toMatch(
      /art\. 38 ust\. 3/,
    );
    expect(FIRST_REVIEW_RULES.effects.negative.source).toMatch(
      /art\. 38 ust\. 3/,
    );
  });
});
