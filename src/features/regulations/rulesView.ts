import type { RulesPack } from "../../../convex/rules/pack2016";
import type { PositionKind, SheetType } from "../../../convex/rules/types";
import type { MatrixRow } from "./matrix";

const POSITION_LABEL: Record<PositionKind, string> = {
  office_head: "Kierujący urzędem",
  managerial: "Stanowisko kierownicze",
  non_managerial: "Stanowisko niekierownicze",
};

export type SheetRow = {
  sheet: SheetType;
  position: string;
  criteria: string[];
  source: string;
};

export function sheetRows(rules: RulesPack): SheetRow[] {
  const names = new Map(rules.catalog.map((entry) => [entry.id, entry.name]));
  return (Object.keys(rules.sheets) as SheetType[]).map((sheet) => {
    const definition = rules.sheets[sheet];
    return {
      sheet,
      position: POSITION_LABEL[definition.positionKind],
      criteria: definition.mandatory.map((id) => names.get(id) ?? id),
      source: definition.source,
    };
  });
}

type PeriodKey =
  | "reviewPeriodMonths"
  | "openingDays"
  | "openingDaysAfterNegative"
  | "absenceExtensionThresholdMonths"
  | "reevaluationAfterNegativeMonths"
  | "deadlineChangeAfterMonths"
  | "objectionDays"
  | "objectionDecisionDays"
  | "mandatoryPromotionDays";

const PERIODS: {
  key: PeriodKey;
  sourceKey: string;
  label: string;
  unit: string;
}[] = [
  {
    key: "reviewPeriodMonths",
    sourceKey: "reviewPeriod",
    label: "Okres między ocenami",
    unit: "mies.",
  },
  {
    key: "openingDays",
    sourceKey: "opening",
    label: "Rozmowa otwierająca",
    unit: "dni",
  },
  {
    key: "openingDaysAfterNegative",
    sourceKey: "opening",
    label: "Rozmowa otwierająca po ocenie negatywnej",
    unit: "dni",
  },
  {
    key: "absenceExtensionThresholdMonths",
    sourceKey: "absenceExtension",
    label: "Nieobecność wydłużająca termin, od",
    unit: "mies.",
  },
  {
    key: "reevaluationAfterNegativeMonths",
    sourceKey: "reevaluation",
    label: "Ponowna ocena po ocenie negatywnej",
    unit: "mies.",
  },
  {
    key: "deadlineChangeAfterMonths",
    sourceKey: "deadlineChange",
    label: "Zmiana terminu możliwa po",
    unit: "mies.",
  },
  {
    key: "objectionDays",
    sourceKey: "objection",
    label: "Sprzeciw od oceny",
    unit: "dni",
  },
  {
    key: "objectionDecisionDays",
    sourceKey: "objectionDecision",
    label: "Rozstrzygnięcie sprzeciwu",
    unit: "dni",
  },
  {
    key: "mandatoryPromotionDays",
    sourceKey: "mandatoryPromotion",
    label: "Obowiązkowy awans",
    unit: "dni",
  },
];

export type PeriodRow = { label: string; value: string; source: string };

export function sourceOf(rules: RulesPack, key: string): string {
  return rules.sources[key] ?? rules.source;
}

export function periodRows(rules: RulesPack): PeriodRow[] {
  return PERIODS.map(({ key, sourceKey, label, unit }) => ({
    label,
    value: `${rules[key]} ${unit}`,
    source: sourceOf(rules, sourceKey),
  }));
}

export type MatrixView = MatrixRow & { source: string };

export function matrixView(rules: RulesPack, rows: MatrixRow[]): MatrixView[] {
  return rows.map((row) => ({
    ...row,
    source: sourceOf(rules, row.sourceKey),
  }));
}

export function coverage(rules: RulesPack, rows: MatrixRow[]) {
  const keys = Object.keys(rules.sources);
  const covered = new Set(rows.map((row) => row.sourceKey));
  return {
    total: keys.length,
    covered: keys.filter((key) => covered.has(key)).length,
    missing: keys.filter((key) => !covered.has(key)),
  };
}
