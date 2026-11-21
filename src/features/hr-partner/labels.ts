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

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
