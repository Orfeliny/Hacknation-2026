import { addMonths, compareDates } from "../rules/dates";

const ACT = "Ustawa o służbie cywilnej";

export type FirstReviewRules = {
  version: string;
  earliestMonthsAfterStart: number;
  latestMonthsBeforeContractEnd: number;
  sources: { window: string; elements: string; effects: string };
  elements: { id: ElementId; label: string; source: string }[];
  effects: Record<"positive" | "negative", { label: string; source: string }>;
};

export type ElementId = "report" | "unit_head";

export const FIRST_REVIEW_RULES: FirstReviewRules = {
  version: "2026-05-12",
  earliestMonthsAfterStart: 8,
  latestMonthsBeforeContractEnd: 1,
  sources: {
    window: `${ACT}, art. 38 ust. 1`,
    elements: `${ACT}, art. 38 ust. 2`,
    effects: `${ACT}, art. 38 ust. 3`,
  },
  elements: [
    {
      id: "report",
      label:
        "Sprawozdanie pracownika z zadań zrealizowanych w przepracowanym okresie",
      source: `${ACT}, art. 38 ust. 2 pkt 3`,
    },
    {
      id: "unit_head",
      label: "Ocena dokonana w porozumieniu z kierującym komórką organizacyjną",
      source: `${ACT}, art. 38 ust. 2`,
    },
  ],
  effects: {
    positive: {
      label:
        "Kierujący komórką wnioskuje do dyrektora generalnego o zawarcie umowy o pracę na czas nieokreślony.",
      source: `${ACT}, art. 38 ust. 3 pkt 1`,
    },
    negative: {
      label:
        "Kierujący komórką wnioskuje o niezawieranie umowy na czas nieokreślony albo o rozwiązanie umowy na czas określony.",
      source: `${ACT}, art. 38 ust. 3 pkt 2`,
    },
  },
};

export type FirstReviewWindow = {
  earliest: string;
  latest?: string;
  source: string;
};

export function computeFirstReviewWindow(
  employmentStart: string,
  contractEnd?: string,
  rules: FirstReviewRules = FIRST_REVIEW_RULES,
): FirstReviewWindow {
  const earliest = addMonths(employmentStart, rules.earliestMonthsAfterStart);
  const latest = contractEnd
    ? addMonths(contractEnd, -rules.latestMonthsBeforeContractEnd)
    : undefined;
  if (latest !== undefined && compareDates(latest, earliest) < 0) {
    throw new Error(
      "Umowa kończy się za wcześnie na pierwszą ocenę: najpóźniejszy termin wypada przed najwcześniejszym.",
    );
  }
  return { earliest, latest, source: rules.sources.window };
}

function pl(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function timingWarning(
  today: string,
  window: FirstReviewWindow,
): string | undefined {
  if (compareDates(today, window.earliest) < 0) {
    return `Termin pierwszej oceny jeszcze nie nadszedł: można ją przeprowadzić najwcześniej ${pl(window.earliest)}, po 8 miesiącach od nawiązania stosunku pracy (${window.source}).`;
  }
  if (window.latest !== undefined && compareDates(today, window.latest) > 0) {
    return `Termin pierwszej oceny minął ${pl(window.latest)} (${window.source}).`;
  }
  return undefined;
}
