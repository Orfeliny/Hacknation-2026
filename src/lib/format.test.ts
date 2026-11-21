import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, today } from "./format";

afterEach(() => {
  vi.useRealTimers();
});

describe("format", () => {
  it("formats a date as DD.MM.RRRR", () => {
    expect(formatDate(new Date(2026, 10, 21))).toBe("21.11.2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05.01.2026");
  });

  it("accepts ISO strings and timestamps", () => {
    expect(formatDate("2026-11-21T12:00:00")).toBe("21.11.2026");
    expect(formatDate(new Date(2026, 10, 21, 12).getTime())).toBe("21.11.2026");
  });

  it("formats date and time", () => {
    expect(formatDateTime(new Date(2026, 10, 21, 9, 5))).toBe(
      "21.11.2026 09:05",
    );
  });

  it("today() follows the mocked clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 21, 8));
    expect(formatDate(today())).toBe("21.11.2026");
  });
});
