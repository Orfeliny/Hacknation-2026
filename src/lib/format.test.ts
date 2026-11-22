import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatLongDate,
  formatShortWithWeekday,
  today,
} from "./format";

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

  it("formats a long date with the weekday", () => {
    expect(formatLongDate(new Date(2026, 10, 20))).toBe(
      "piątek, 20 listopada 2026",
    );
    expect(formatLongDate(new Date(2026, 10, 21))).toBe(
      "sobota, 21 listopada 2026",
    );
  });

  it("formats a short date with the weekday", () => {
    expect(formatShortWithWeekday(new Date(2026, 10, 27))).toBe(
      "pt 27.11.2026",
    );
    expect(formatShortWithWeekday(new Date(2026, 10, 28))).toBe(
      "sob 28.11.2026",
    );
  });

  it("today() follows the mocked clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 21, 8));
    expect(formatDate(today())).toBe("21.11.2026");
  });
});
