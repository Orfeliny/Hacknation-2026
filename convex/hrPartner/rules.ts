import {
  compareDates,
  daysBetween,
  lastsLongerThanMonths,
  mergeContinuousAbsences,
  type Period,
} from "../rules/dates";
import { RULES_2016 } from "../rules/pack2016";

export type SignalKind =
  | "workload"
  | "no_recognition"
  | "duties_change"
  | "long_absence"
  | "supervisor_change"
  | "recognition_moment";

export const HR_RULES = {
  workloadWindowDays: 42,
  workloadMinNotes: 3,
  noRecognitionDays: 90,
  dutiesChangeWindowDays: 180,
  longAbsenceWindowDays: 60,
  supervisorChangeWindowDays: 180,
  recognitionMinAgeDays: 3,
  recognitionMaxAgeDays: 30,
  recognitionMaxListed: 3,
} as const;

export type ObservationFact = {
  date: string;
  sentiment: "positive" | "development" | "neutral";
  wellbeing: boolean;
  criterionId?: string;
};

export type StaffingFact = {
  kind: "evaluator_change" | "duties_change" | "long_absence";
  from: string;
  to?: string;
};

export type SignalInput = {
  observations: ObservationFact[];
  staffingEvents: StaffingFact[];
};

// `reason` carries the evidence (counts and dates) and nothing that changes with the clock, so the
// same evidence always gives the same text. It also goes into the model prompt: no names, no free text.
export type ComputedSignal = {
  kind: SignalKind;
  reason: string;
  evidenceDate: string;
};

const ORDER: SignalKind[] = [
  "workload",
  "long_absence",
  "supervisor_change",
  "duties_change",
  "no_recognition",
  "recognition_moment",
];

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tail = n % 10;
  return tail >= 2 && tail <= 4 && !(n % 100 >= 12 && n % 100 <= 14)
    ? few
    : many;
}

function criterionName(id: string | undefined): string | null {
  if (!id) return null;
  return RULES_2016.catalog.find((entry) => entry.id === id)?.name ?? id;
}

const ageOf = (date: string, today: string) => daysBetween(date, today);

function workload(input: SignalInput, today: string): ComputedSignal[] {
  const notes = input.observations
    .filter(
      (o) =>
        o.wellbeing &&
        ageOf(o.date, today) >= 0 &&
        ageOf(o.date, today) <= HR_RULES.workloadWindowDays,
    )
    .sort((a, b) => compareDates(a.date, b.date));
  const first = notes[0];
  const last = notes[notes.length - 1];
  if (!first || !last || notes.length < HR_RULES.workloadMinNotes) return [];
  const n = notes.length;
  return [
    {
      kind: "workload",
      reason: `${n} ${plural(n, "obserwacja", "obserwacje", "obserwacji")} dotyczących obciążenia lub dobrostanu w ciągu ${HR_RULES.workloadWindowDays} dni (od ${first.date} do ${last.date})`,
      evidenceDate: last.date,
    },
  ];
}

function noRecognition(input: SignalInput, today: string): ComputedSignal[] {
  if (input.observations.length === 0) return [];
  const positives = input.observations
    .filter((o) => o.sentiment === "positive")
    .sort((a, b) => compareDates(b.date, a.date));
  const newestPositive = positives[0];
  if (newestPositive) {
    const last = newestPositive.date;
    if (ageOf(last, today) <= HR_RULES.noRecognitionDays) return [];
    return [
      {
        kind: "no_recognition",
        reason: `Ostatnia pozytywna obserwacja pochodzi z ${last}, czyli sprzed ponad ${HR_RULES.noRecognitionDays} dni`,
        evidenceDate: last,
      },
    ];
  }
  const oldest = [...input.observations].sort((a, b) =>
    compareDates(a.date, b.date),
  )[0];
  if (!oldest) return [];
  const earliest = oldest.date;
  if (ageOf(earliest, today) <= HR_RULES.noRecognitionDays) return [];
  return [
    {
      kind: "no_recognition",
      reason: `Brak pozytywnej obserwacji od pierwszej obserwacji z ${earliest}, czyli ponad ${HR_RULES.noRecognitionDays} dni`,
      evidenceDate: earliest,
    },
  ];
}

function newestEvent(
  input: SignalInput,
  kind: StaffingFact["kind"],
  windowDays: number,
  today: string,
): StaffingFact | undefined {
  return input.staffingEvents
    .filter(
      (event) =>
        event.kind === kind &&
        ageOf(event.from, today) >= 0 &&
        ageOf(event.from, today) <= windowDays,
    )
    .sort((a, b) => compareDates(b.from, a.from))[0];
}

function dutiesChange(input: SignalInput, today: string): ComputedSignal[] {
  const event = newestEvent(
    input,
    "duties_change",
    HR_RULES.dutiesChangeWindowDays,
    today,
  );
  return event
    ? [
        {
          kind: "duties_change",
          reason: `Zmiana zakresu zadań od ${event.from}`,
          evidenceDate: event.from,
        },
      ]
    : [];
}

function supervisorChange(input: SignalInput, today: string): ComputedSignal[] {
  const event = newestEvent(
    input,
    "evaluator_change",
    HR_RULES.supervisorChangeWindowDays,
    today,
  );
  return event
    ? [
        {
          kind: "supervisor_change",
          reason: `Zmiana przełożonego od ${event.from}`,
          evidenceDate: event.from,
        },
      ]
    : [];
}

function longAbsence(input: SignalInput, today: string): ComputedSignal[] {
  const ongoing = (event: StaffingFact) => event.to === undefined;
  const periods: Period[] = input.staffingEvents
    .filter((event) => event.kind === "long_absence")
    .filter((event) => compareDates(event.from, today) <= 0)
    .map((event) => ({ from: event.from, to: event.to ?? today }));
  const hasOngoing = input.staffingEvents.some(
    (event) => event.kind === "long_absence" && ongoing(event),
  );
  const latest = mergeContinuousAbsences(periods)
    .filter((period) => lastsLongerThanMonths(period, 1))
    .filter(
      (period) =>
        (hasOngoing && period.to === today) ||
        daysBetween(period.to, today) <= HR_RULES.longAbsenceWindowDays,
    )
    .at(-1);
  if (!latest) return [];
  const running = hasOngoing && latest.to === today;
  return [
    {
      kind: "long_absence",
      reason: running
        ? `Nieobecność trwa od ${latest.from}`
        : `Nieobecność od ${latest.from} do ${latest.to}`,
      evidenceDate: running ? latest.from : latest.to,
    },
  ];
}

function recognitionMoments(
  input: SignalInput,
  today: string,
): ComputedSignal[] {
  const dates = [
    ...new Set(
      input.observations
        .filter(
          (o) =>
            o.sentiment === "positive" &&
            ageOf(o.date, today) >= HR_RULES.recognitionMinAgeDays &&
            ageOf(o.date, today) <= HR_RULES.recognitionMaxAgeDays,
        )
        .map((o) => o.date),
    ),
  ]
    .sort((a, b) => compareDates(b, a))
    .slice(0, HR_RULES.recognitionMaxListed);
  return dates.map((date) => {
    const criterion = criterionName(
      input.observations.find(
        (o) => o.date === date && o.sentiment === "positive",
      )?.criterionId,
    );
    return {
      kind: "recognition_moment" as const,
      reason: `Pozytywna obserwacja z ${date}${criterion ? ` (kryterium: ${criterion})` : ""} czeka na docenienie`,
      evidenceDate: date,
    };
  });
}

export function computeSignals(
  input: SignalInput,
  today: string,
): ComputedSignal[] {
  return [
    ...workload(input, today),
    ...longAbsence(input, today),
    ...supervisorChange(input, today),
    ...dutiesChange(input, today),
    ...noRecognition(input, today),
    ...recognitionMoments(input, today),
  ].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}
