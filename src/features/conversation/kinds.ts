import { z } from "zod";
import { RULES_2016 } from "../../../convex/rules/pack2016";

export const conversationKindSchema = z.enum([
  "opening",
  "evaluation",
  "feedback",
]);
export type ConversationKind = z.infer<typeof conversationKindSchema>;

export const KIND_QUERY_VALUES: Record<string, ConversationKind> = {
  rozpoczynajaca: "opening",
  oceniajaca: "evaluation",
  biezaca: "feedback",
  opening: "opening",
  evaluation: "evaluation",
  feedback: "feedback",
};

export const KIND_QUERY_NAMES: Record<ConversationKind, string> = {
  opening: "rozpoczynajaca",
  evaluation: "oceniajaca",
  feedback: "biezaca",
};

export const KINDS: readonly ConversationKind[] = [
  "opening",
  "evaluation",
  "feedback",
];

export const KIND_LABELS: Record<ConversationKind, string> = {
  opening: "Rozpoczynająca",
  evaluation: "Oceniająca",
  feedback: "Bieżąca",
};

export const KIND_HINTS: Record<ConversationKind, string> = {
  opening:
    "Lista kontrolna obejmuje arkusz, do 3 kryteriów dodatkowych, oczekiwania i termin oceny. Pracownik potwierdza, że zna kryteria, ale nie musi się z nimi zgadzać.",
  evaluation:
    "Musi się odbyć przed sporządzeniem oceny. Jej datę wpisujesz też w arkuszu oceny.",
  feedback:
    "Zalecana, ale nieobowiązkowa. Nie ma terminu ani etapu w ocenie. Lista jest krótka: co działa, co poprawić i czego pracownik potrzebuje.",
};

export const KIND_SHORT_HINTS: Record<ConversationKind, string> = {
  opening: "Kryteria i oczekiwania na początek okresu oceny.",
  evaluation: "Musi się odbyć przed sporządzeniem oceny.",
  feedback: "Zalecana, ale nieobowiązkowa.",
};

export const ITEM_INVITATION = "Zaproszenie wysłane z wyprzedzeniem";
export const ITEM_OBSERVATIONS = "Przejrzane obserwacje z całego okresu";
export const ITEM_CRITERIA_EXAMPLES = "Każde kryterium ma przykład z okresu";
export const ITEM_OWN_NOTES = "Pracownik wie, że może przynieść własne notatki";

export const CHECKLISTS: Record<ConversationKind, readonly string[]> = {
  opening: [
    ITEM_INVITATION,
    "Arkusz i kryteria dodatkowe wybrane",
    "Oczekiwania wobec każdego kryterium spisane",
    "Zarezerwowany czas i osobna sala",
  ],
  evaluation: [
    ITEM_INVITATION,
    "Pracownik zna kryteria i oczekiwania",
    ITEM_OBSERVATIONS,
    ITEM_CRITERIA_EXAMPLES,
    ITEM_OWN_NOTES,
    "Zarezerwowane 60 minut i osobna sala",
  ],
  feedback: [
    "Wiem, co działa",
    "Wiem, co warto poprawić",
    "Wiem, czego pracownik potrzebuje",
  ],
};

export function criterionName(id: string): string {
  return RULES_2016.catalog.find((c) => c.id === id)?.name ?? id;
}
