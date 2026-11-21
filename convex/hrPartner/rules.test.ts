import { describe, expect, it } from "vitest";
import { addDays } from "../rules/dates";
import {
  computeSignals,
  HR_RULES,
  type ObservationFact,
  type SignalInput,
  type StaffingFact,
} from "./rules";

const TODAY = "2026-11-21";
const ago = (days: number) => addDays(TODAY, -days);

const note = (
  daysAgo: number,
  patch: Partial<ObservationFact> = {},
): ObservationFact => ({
  date: ago(daysAgo),
  sentiment: "neutral",
  wellbeing: false,
  ...patch,
});

const input = (
  observations: ObservationFact[] = [],
  staffingEvents: StaffingFact[] = [],
): SignalInput => ({ observations, staffingEvents });

const kinds = (data: SignalInput) =>
  computeSignals(data, TODAY).map((signal) => signal.kind);

describe("workload", () => {
  const wellbeing = (daysAgo: number) => note(daysAgo, { wellbeing: true });

  it("needs three tagged observations in the window", () => {
    expect(kinds(input([wellbeing(5), wellbeing(10)]))).not.toContain(
      "workload",
    );
    expect(
      kinds(input([wellbeing(5), wellbeing(10), wellbeing(20)])),
    ).toContain("workload");
  });

  it("counts an observation exactly 42 days old and ignores one that is 43 days old", () => {
    const edge = [
      wellbeing(1),
      wellbeing(2),
      wellbeing(HR_RULES.workloadWindowDays),
    ];
    expect(kinds(input(edge))).toContain("workload");
    const outside = [
      wellbeing(1),
      wellbeing(2),
      wellbeing(HR_RULES.workloadWindowDays + 1),
    ];
    expect(kinds(input(outside))).not.toContain("workload");
  });

  it("ignores observations that are not tagged", () => {
    expect(kinds(input([note(1), note(2), note(3)]))).not.toContain("workload");
  });

  it("states the evidence in the reason and keeps it stable for the same evidence", () => {
    const data = input([wellbeing(5), wellbeing(10), wellbeing(20)]);
    const [signal] = computeSignals(data, TODAY);
    expect(signal).toMatchObject({
      kind: "workload",
      evidenceDate: ago(5),
      reason: `3 obserwacje dotyczących obciążenia lub dobrostanu w ciągu 42 dni (od ${ago(20)} do ${ago(5)})`,
    });
    expect(computeSignals(data, addDays(TODAY, 1))[0]?.reason).toBe(
      signal?.reason,
    );
  });

  it("changes the reason when a new observation arrives", () => {
    const before = computeSignals(
      input([wellbeing(5), wellbeing(10), wellbeing(20)]),
      TODAY,
    )[0];
    const after = computeSignals(
      input([wellbeing(1), wellbeing(5), wellbeing(10), wellbeing(20)]),
      TODAY,
    )[0];
    expect(after.reason).not.toBe(before.reason);
    expect(after.reason).toContain("4 obserwacje");
  });
});

describe("no_recognition", () => {
  const positive = (daysAgo: number) =>
    note(daysAgo, { sentiment: "positive" });

  it("fires after more than 90 days without a positive observation", () => {
    expect(kinds(input([positive(90)]))).not.toContain("no_recognition");
    expect(kinds(input([positive(91)]))).toContain("no_recognition");
  });

  it("looks at the newest positive observation", () => {
    expect(kinds(input([positive(200), positive(30)]))).not.toContain(
      "no_recognition",
    );
  });

  it("fires when there are only non-positive observations older than 90 days", () => {
    expect(kinds(input([note(120)]))).toContain("no_recognition");
    expect(kinds(input([note(60)]))).not.toContain("no_recognition");
  });

  it("stays silent when there are no observations at all", () => {
    expect(kinds(input())).toEqual([]);
  });
});

describe("recognition_moment", () => {
  const positive = (daysAgo: number, criterionId?: string) =>
    note(daysAgo, { sentiment: "positive", criterionId });

  it("appears 3 days after a positive observation and stops after 30 days", () => {
    expect(kinds(input([positive(2)]))).not.toContain("recognition_moment");
    expect(kinds(input([positive(3)]))).toContain("recognition_moment");
    expect(kinds(input([positive(30)]))).toContain("recognition_moment");
    expect(kinds(input([positive(31)]))).not.toContain("recognition_moment");
  });

  it("names the criterion and lists at most three moments, newest first", () => {
    const signals = computeSignals(
      input([
        positive(4, "komunikacja"),
        positive(6),
        positive(8),
        positive(10),
      ]),
      TODAY,
    ).filter((signal) => signal.kind === "recognition_moment");
    expect(signals.map((signal) => signal.evidenceDate)).toEqual([
      ago(4),
      ago(6),
      ago(8),
    ]);
    expect(signals[0]?.reason).toBe(
      `Pozytywna obserwacja z ${ago(4)} (kryterium: Komunikacja) czeka na docenienie`,
    );
  });
});

describe("staffing signals", () => {
  it("flags a duties change within 180 days and not older", () => {
    const event = (daysAgo: number): StaffingFact => ({
      kind: "duties_change",
      from: ago(daysAgo),
    });
    expect(kinds(input([], [event(180)]))).toContain("duties_change");
    expect(kinds(input([], [event(181)]))).not.toContain("duties_change");
  });

  it("flags a supervisor change within 180 days", () => {
    const [signal] = computeSignals(
      input([], [{ kind: "evaluator_change", from: ago(100) }]),
      TODAY,
    );
    expect(signal).toMatchObject({
      kind: "supervisor_change",
      reason: `Zmiana przełożonego od ${ago(100)}`,
    });
  });

  it("uses only the newest event of a kind", () => {
    const [signal] = computeSignals(
      input(
        [],
        [
          { kind: "duties_change", from: ago(150) },
          { kind: "duties_change", from: ago(20) },
        ],
      ),
      TODAY,
    );
    expect(signal?.evidenceDate).toBe(ago(20));
  });

  it("merges absences separated only by days off and requires more than a month", () => {
    const merged: StaffingFact[] = [
      { kind: "long_absence", from: "2026-10-05", to: "2026-10-16" },
      { kind: "long_absence", from: "2026-10-19", to: "2026-11-06" },
    ];
    const [signal] = computeSignals(input([], merged), TODAY);
    expect(signal).toMatchObject({
      kind: "long_absence",
      reason: "Nieobecność od 2026-10-05 do 2026-11-06",
      evidenceDate: "2026-11-06",
    });
    const short: StaffingFact[] = [
      { kind: "long_absence", from: "2026-11-01", to: "2026-11-10" },
    ];
    expect(kinds(input([], short))).not.toContain("long_absence");
  });

  it("stops flagging an absence that ended more than 60 days ago", () => {
    const old: StaffingFact[] = [
      { kind: "long_absence", from: ago(130), to: ago(61) },
    ];
    expect(kinds(input([], old))).not.toContain("long_absence");
    const recent: StaffingFact[] = [
      { kind: "long_absence", from: ago(130), to: ago(60) },
    ];
    expect(kinds(input([], recent))).toContain("long_absence");
  });

  it("flags an absence that is still running", () => {
    const [signal] = computeSignals(
      input([], [{ kind: "long_absence", from: ago(45) }]),
      TODAY,
    );
    expect(signal).toMatchObject({
      kind: "long_absence",
      reason: `Nieobecność trwa od ${ago(45)}`,
    });
    expect(
      kinds(input([], [{ kind: "long_absence", from: ago(10) }])),
    ).not.toContain("long_absence");
  });
});

describe("computeSignals", () => {
  it("returns nothing for an employee with no data", () => {
    expect(computeSignals(input(), TODAY)).toEqual([]);
  });

  it("orders signals by importance", () => {
    const data = input(
      [
        note(5, { wellbeing: true }),
        note(10, { wellbeing: true }),
        note(20, { wellbeing: true }),
        note(4, { sentiment: "positive" }),
      ],
      [{ kind: "duties_change", from: ago(30) }],
    );
    expect(kinds(data)).toEqual([
      "workload",
      "duties_change",
      "recognition_moment",
    ]);
  });
});
