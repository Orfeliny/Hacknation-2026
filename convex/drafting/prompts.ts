import { z } from "zod";
import { MAX_DRAFT_TEXT } from "./limits";

const text = z.string().min(1).max(MAX_DRAFT_TEXT);
// Labels such as "O3": the model cites the observations it relied on.
const evidence = z.array(z.string().max(12)).max(8);

export const draftSchema = z.object({
  criteria: z
    .array(z.object({ criterionId: z.string(), text, evidence }))
    .max(20),
  strengths: z.array(z.object({ text, evidence })).max(5),
  developmentAreas: z
    .array(z.object({ key: z.string().max(40), text, evidence }))
    .max(5),
  developmentActions: z
    .array(z.object({ areaKey: z.string().max(40), text, evidence }))
    .max(8),
  feedbackTips: z.array(z.object({ text })).max(4),
});

export type DraftOutput = z.infer<typeof draftSchema>;

export const DRAFT_SYSTEM = [
  "Jesteś asystentem przełożonego, który pisze projekt treści oceny okresowej w służbie cywilnej.",
  "Przełożony już wybrał oceny kryteriów. Podane poziomy są faktami, które masz uzasadnić. Nie wybierasz, nie proponujesz i nie zmieniasz ocen, nie podajesz poziomu oceny ogólnej i nie piszesz, jaką ocenę pracownik powinien dostać.",
  "Opieraj się wyłącznie na podanych obserwacjach. Przy każdym fragmencie wpisz w polu evidence etykiety obserwacji, na których się opiera (np. O1, O3). Etykiet obserwacji nie wpisuj w treści fragmentu, tylko w polu evidence. Jeśli nie masz podstawy w obserwacjach, zostaw evidence puste i nie zmyślaj faktów.",
  "Dla każdego ocenionego kryterium napisz krótkie uzasadnienie (criteria). Dodaj mocne strony (strengths), obszary do rozwoju (developmentAreas, każdy z unikalnym krótkim kluczem key), działania rozwojowe (developmentActions, każde z areaKey wskazującym klucz obszaru, np. szkolenie, mentoring, zadanie rozwojowe) oraz wskazówki konstruktywnej informacji zwrotnej (feedbackTips).",
  "Nie stawiasz diagnoz medycznych ani psychologicznych. Piszesz po polsku, konkretnie i wprost, jak przełożony piszący własne uzasadnienie.",
  "Imię i nazwisko pracownika oraz przełożonego są zastąpione znacznikami [PRACOWNIK] i [PRACOWNIK_2]. Nie próbuj ich odgadywać.",
].join("\n");

type Context = {
  ratings: { criterionId: string; name: string; label: string }[];
  observations: {
    label: string;
    date: string;
    sentiment: "positive" | "development" | "neutral";
    criterionId: string | null;
    text: string;
  }[];
};

const SENTIMENT: Record<string, string> = {
  positive: "pozytywna",
  development: "rozwojowa",
  neutral: "neutralna",
};

export function buildDraftPrompt(context: Context): string {
  const names = new Map(context.ratings.map((r) => [r.criterionId, r.name]));
  const criteria = context.ratings
    .map(
      (r) =>
        `- ${r.criterionId}: ${r.name}, poziom wybrany przez przełożonego: ${r.label}`,
    )
    .join("\n");
  const observations =
    context.observations.length === 0
      ? "(brak obserwacji)"
      : context.observations
          .map((o) => {
            const criterion = o.criterionId
              ? `, kryterium: ${names.get(o.criterionId) ?? o.criterionId}`
              : "";
            return `${o.label} [${o.date}, ${SENTIMENT[o.sentiment] ?? o.sentiment}${criterion}]: ${o.text}`;
          })
          .join("\n");
  return `Ocenione kryteria:\n${criteria}\n\nObserwacje przełożonego z okresu oceny:\n${observations}\n\nNapisz projekt treści oceny dla pracownika [PRACOWNIK].`;
}

// The mock provider answers with this when AI_PROVIDER is "mock": it quotes real labels, so the
// page and the tests see the same shape a model would return.
export function draftFixture(context: Context): DraftOutput {
  const labelFor = (criterionId: string) =>
    context.observations.find((o) => o.criterionId === criterionId)?.label;
  const positive = context.observations.find((o) => o.sentiment === "positive");
  const development = context.observations.find(
    (o) => o.sentiment === "development",
  );
  return {
    criteria: context.ratings.map((r) => {
      const label = labelFor(r.criterionId);
      return {
        criterionId: r.criterionId,
        text: label
          ? `W kryterium „${r.name}” uzasadnienie opiera się na obserwacji przełożonego z okresu oceny. Uzupełnij je własnymi przykładami.`
          : `W kryterium „${r.name}” nie ma w obserwacjach przykładów, na których można oprzeć uzasadnienie. Opisz własne obserwacje.`,
        evidence: label ? [label] : [],
      };
    }),
    strengths: positive
      ? [
          {
            text: "Skuteczne i jasne działanie w sytuacjach opisanych w pozytywnych obserwacjach.",
            evidence: [positive.label],
          },
        ]
      : [],
    developmentAreas: development
      ? [
          {
            key: "obszar1",
            text: "Obszar wskazany w obserwacjach rozwojowych wymaga dalszej pracy.",
            evidence: [development.label],
          },
        ]
      : [],
    developmentActions: development
      ? [
          {
            areaKey: "obszar1",
            text: "Szkolenie lub mentoring w obszarze z obserwacji rozwojowych, z omówieniem postępów po trzech miesiącach.",
            evidence: [development.label],
          },
        ]
      : [],
    feedbackTips: [
      {
        text: "Zacznij od konkretnego zachowania i jego skutku, potem zapytaj pracownika o jego perspektywę i ustalcie jeden następny krok.",
      },
    ],
  };
}
