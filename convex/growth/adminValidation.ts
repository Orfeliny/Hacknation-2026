import { ConvexError } from "convex/values";
import { z } from "zod";
import { normalizeText } from "./optionsSearch";

export const ADMIN_LIMITS = {
  title: 150,
  description: 1000,
  summary: 300,
  note: 200,
  provider: 150,
  url: 500,
  sourceRef: 200,
  sections: 20,
  heading: 150,
  paragraph: 1500,
  bullet: 300,
  items: 20,
  slug: 100,
  readingMinutes: 60,
} as const;

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}: wpisz treść.`)
    .max(max, `${label}: najwyżej ${max} znaków.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label}: najwyżej ${max} znaków.`)
    .optional()
    .transform((value) => value || undefined);

const httpsUrl = z
  .string()
  .trim()
  .max(ADMIN_LIMITS.url, `Adres: najwyżej ${ADMIN_LIMITS.url} znaków.`)
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => {
    if (value === undefined) return true;
    try {
      return (
        /^https:\/\/[^\s/]/i.test(value) && new URL(value).protocol === "https:"
      );
    } catch {
      return false;
    }
  }, "Adres musi zaczynać się od https://.");

const optionInput = z.object({
  title: text("Tytuł", ADMIN_LIMITS.title),
  description: text("Opis", ADMIN_LIMITS.description),
  criterionCount: z.number().min(1, "Wybierz co najmniej jedno kryterium."),
  costNote: optionalText("Uwaga o koszcie", ADMIN_LIMITS.note),
  provider: optionalText("Organizator", ADMIN_LIMITS.provider),
  url: httpsUrl,
  durationNote: optionalText("Czas trwania", ADMIN_LIMITS.note),
});

const section = z
  .object({
    heading: text("Nagłówek sekcji", ADMIN_LIMITS.heading),
    paragraphs: z
      .array(text("Akapit", ADMIN_LIMITS.paragraph))
      .max(ADMIN_LIMITS.items),
    bullets: z
      .array(text("Punkt", ADMIN_LIMITS.bullet))
      .max(ADMIN_LIMITS.items),
  })
  .refine(
    (value) => value.paragraphs.length + value.bullets.length > 0,
    "Każda sekcja potrzebuje akapitu lub punktu.",
  );

const articleInput = z.object({
  title: text("Tytuł", ADMIN_LIMITS.title),
  summary: text("Streszczenie", ADMIN_LIMITS.summary),
  sections: z
    .array(section)
    .min(1, "Dodaj co najmniej jedną sekcję.")
    .max(ADMIN_LIMITS.sections, `Najwyżej ${ADMIN_LIMITS.sections} sekcji.`),
  readingMinutes: z
    .number()
    .int("Czas czytania: liczba całkowita.")
    .min(1, "Czas czytania: co najmniej 1 minuta.")
    .max(ADMIN_LIMITS.readingMinutes, "Czas czytania: najwyżej 60 minut.")
    .optional(),
  sourceRef: optionalText("Źródło", ADMIN_LIMITS.sourceRef),
});

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConvexError(
      result.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  return result.data;
}

export const parseOptionInput = (value: {
  title: string;
  description: string;
  criterionIds: readonly string[];
  costNote?: string;
  provider?: string;
  url?: string;
  durationNote?: string;
}) => {
  const { criterionIds, ...rest } = value;
  return parse(optionInput, { ...rest, criterionCount: criterionIds.length });
};

export const parseArticleInput = (value: {
  title: string;
  summary: string;
  sections: { heading: string; paragraphs: string[]; bullets: string[] }[];
  readingMinutes?: number;
  sourceRef?: string;
}) => parse(articleInput, value);

// A readable slug from the title: lower case, no diacritics, hyphens.
export function slugOf(title: string): string {
  const slug = normalizeText(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ADMIN_LIMITS.slug - 6)
    .replace(/-+$/g, "");
  return slug || "porada";
}
