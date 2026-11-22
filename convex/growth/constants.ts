import { v } from "convex/values";

function literals<const T extends readonly string[]>(values: T) {
  return v.union(...values.map((value) => v.literal(value as T[number])));
}

export const DEVELOPMENT_FORMS = [
  "szkolenie",
  "kurs",
  "mentoring",
  "material",
  "zadanie_rozwojowe",
  "wymiana_doswiadczen",
] as const;

export const DEVELOPMENT_LEVELS = [
  "podstawowy",
  "sredni",
  "zaawansowany",
] as const;

export const DEVELOPMENT_COSTS = [
  "bezplatne",
  "platne",
  "brak_danych",
] as const;

export const GROWTH_SOURCES = ["demo", "material_kprm", "urzad"] as const;

export const ADVICE_TOPICS = [
  "informacja_zwrotna",
  "rozmowa_oceniajaca",
  "dobrostan",
  "docenianie",
  "kryteria_oceny",
  "inne",
] as const;

// Who an article is written for. A missing value on a stored article means "przelozony".
export const ADVICE_AUDIENCES = ["przelozony", "pracownik", "wszyscy"] as const;

export type DevelopmentForm = (typeof DEVELOPMENT_FORMS)[number];
export type DevelopmentLevel = (typeof DEVELOPMENT_LEVELS)[number];
export type DevelopmentCost = (typeof DEVELOPMENT_COSTS)[number];
export type GrowthSource = (typeof GROWTH_SOURCES)[number];
export type AdviceTopic = (typeof ADVICE_TOPICS)[number];
export type AdviceAudience = (typeof ADVICE_AUDIENCES)[number];

export const DEVELOPMENT_FORM_LABELS: Record<DevelopmentForm, string> = {
  szkolenie: "Szkolenie",
  kurs: "Kurs",
  mentoring: "Mentoring",
  material: "Materiał",
  zadanie_rozwojowe: "Zadanie rozwojowe",
  wymiana_doswiadczen: "Wymiana doświadczeń",
};

export const DEVELOPMENT_LEVEL_LABELS: Record<DevelopmentLevel, string> = {
  podstawowy: "Podstawowy",
  sredni: "Średni",
  zaawansowany: "Zaawansowany",
};

export const DEVELOPMENT_COST_LABELS: Record<DevelopmentCost, string> = {
  bezplatne: "Bezpłatne",
  platne: "Płatne",
  brak_danych: "Brak danych",
};

// Contract rule: every "demo" entry shows this label in the UI.
export const GROWTH_SOURCE_LABELS: Record<GrowthSource, string> = {
  demo: "Dane demonstracyjne",
  material_kprm: "Materiał KPRM",
  urzad: "Urząd",
};

export const ADVICE_TOPIC_LABELS: Record<AdviceTopic, string> = {
  informacja_zwrotna: "Informacja zwrotna",
  rozmowa_oceniajaca: "Rozmowa oceniająca",
  dobrostan: "Dobrostan",
  docenianie: "Docenianie",
  kryteria_oceny: "Kryteria",
  inne: "Inne",
};

export const ADVICE_AUDIENCE_LABELS: Record<AdviceAudience, string> = {
  przelozony: "Dla przełożonego",
  pracownik: "Dla pracownika",
  wszyscy: "Dla wszystkich",
};

export const developmentForm = literals(DEVELOPMENT_FORMS);
export const developmentLevel = literals(DEVELOPMENT_LEVELS);
export const developmentCost = literals(DEVELOPMENT_COSTS);
export const growthSource = literals(GROWTH_SOURCES);
export const adviceTopic = literals(ADVICE_TOPICS);
export const adviceAudience = literals(ADVICE_AUDIENCES);

// Structured content instead of Markdown, so rendering needs no new npm dependency.
export const adviceSection = v.object({
  heading: v.string(),
  paragraphs: v.array(v.string()),
  bullets: v.array(v.string()),
});
