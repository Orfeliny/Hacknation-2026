export { MAX_QUESTION_LENGTH } from "../../../convex/hrPartner/limits";

export const SIGNAL_LABEL: Record<string, string> = {
  workload: "Możliwe przeciążenie",
  no_recognition: "Dawno bez docenienia",
  duties_change: "Zmiana zakresu zadań",
  long_absence: "Długa nieobecność",
  supervisor_change: "Zmiana przełożonego",
  recognition_moment: "Dobry moment na docenienie",
};

export const RECOMMENDATION_LABEL: Record<string, string> = {
  wellbeing: "Dobrostan",
  organizational: "Organizacja pracy",
  preventive: "Prewencja",
  conversation: "Rozmowa",
  recognition: "Docenienie",
};

export function plDates(text: string): string {
  return text.replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (_, year: string, month: string, day: string) => `${day}.${month}.${year}`,
  );
}

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
