export { MAX_DRAFT_TEXT } from "../../../convex/drafting/limits";

export const SECTION_LABEL: Record<string, string> = {
  criterion_justification: "Uzasadnienia kryteriów",
  strength: "Mocne strony",
  development_area: "Obszary do rozwoju",
  development_action: "Działania rozwojowe",
  feedback_tip: "Wskazówki konstruktywnej informacji zwrotnej",
};

export const STATUS_LABEL: Record<string, string> = {
  proposed: "Propozycja",
  accepted: "Zaakceptowane",
  edited: "Edytowane",
  rejected: "Odrzucone",
};

export const SENTIMENT_LABEL: Record<string, string> = {
  positive: "pozytywna",
  development: "rozwojowa",
  neutral: "neutralna",
};

// One clipboard helper for a fragment and for a whole section: it says what happened.
export async function copyToClipboard(
  text: string,
): Promise<{ text: string; error: boolean }> {
  try {
    await navigator.clipboard.writeText(text);
    return { text: "Skopiowano do schowka.", error: false };
  } catch {
    return {
      text: "Nie udało się skopiować. Zaznacz tekst i skopiuj go ręcznie.",
      error: true,
    };
  }
}

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

export function errorText(error: unknown, fallback: string): string {
  const data: unknown =
    typeof error === "object" && error !== null && "data" in error
      ? error.data
      : undefined;
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }
  return fallback;
}
