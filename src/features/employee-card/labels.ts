import type { Doc } from "../../../convex/_generated/dataModel";

export const CORPS_ROLE: Record<"official" | "employee", string> = {
  official: "Urzędnik służby cywilnej",
  employee: "Pracownik służby cywilnej",
};

export const POSITION_KIND: Record<
  NonNullable<Doc<"employees">["positionKind"]>,
  string
> = {
  office_head: "Kierownictwo urzędu, arkusz A",
  managerial: "Z kierowaniem ludźmi, arkusz B",
  non_managerial: "Bez kierowania ludźmi, arkusz C",
};

export const EVENT_LABEL = {
  evaluator_change: "Zmiana oceniającego",
  duties_change: "Zmiana zakresu obowiązków",
  long_absence: "Nieobecność dłuższa niż miesiąc",
} as const;

export const REASON_LABEL: Record<string, string> = {
  employee_request: "Wniosek pracownika",
  evaluator_change: "Zmiana oceniającego",
  absence_extension: "Nieobecność dłuższa niż miesiąc",
  employee_absence: "Nieobecność pracownika",
  evaluator_absence: "Nieobecność oceniającego",
};

export const STATUS_LABEL = {
  requested: "Czeka na decyzję przełożonego",
  approved: "Uwzględniony",
  rejected: "Nieuwzględniony",
} as const;

export const ISAP =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20082271505";
