import { ConvexError } from "convex/values";
import { z } from "zod";
import { KNOWLEDGE_LIMITS } from "../lib/contracts/knowledgeDocs";
import { checkPublicHttpsUrl } from "./urlSafety";

export type DocumentKind = "pdf" | "docx" | "html" | "markdown";

const text = (label: string, max: number) =>
  z
    .string()
    .transform(normalizeSpaces)
    .pipe(
      z
        .string()
        .min(1, `${label}: wpisz wartość.`)
        .max(max, `${label}: najwyżej ${max} znaków.`),
    );

// ELI drops the spaces between spans and uploads carry stray whitespace: collapse it.
export function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi mieć format RRRR-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    );
  }, "Podaj istniejącą datę.");

export const checklistSchema = z.object({
  validityScope: text("Zakres obowiązywania", KNOWLEDGE_LIMITS.checklistText),
  legalBasis: text("Podstawa prawna", KNOWLEDGE_LIMITS.checklistText),
  effectiveDate: isoDate,
  publicationDate: isoDate,
  polishLanguage: z.boolean(),
  publicationConsent: z.boolean(),
});

const commonSchema = z
  .object({
    title: text("Tytuł", KNOWLEDGE_LIMITS.title),
    scope: z.enum(["national", "office", "unit"]),
    unit: text("Jednostka", KNOWLEDGE_LIMITS.unit).optional(),
    description: text("Opis", KNOWLEDGE_LIMITS.description).optional(),
    checklist: checklistSchema.optional(),
  })
  .transform((value) => ({
    ...value,
    unit: value.scope === "unit" ? value.unit : undefined,
  }))
  .refine((value) => value.scope !== "unit" || value.unit !== undefined, {
    message: "Dla zakresu „jednostka” podaj jednostkę.",
    path: ["unit"],
  });

const fileSchema = z.object({
  fileName: text("Nazwa pliku", KNOWLEDGE_LIMITS.fileName),
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

const EXTENSIONS: Record<string, DocumentKind> = {
  pdf: "pdf",
  docx: "docx",
  html: "html",
  htm: "html",
  md: "markdown",
  markdown: "markdown",
};

export function fileKindOf(fileName: string): DocumentKind {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension === "doc") {
    throw new ConvexError(
      "Pliki .doc nie są obsługiwane: zapisz dokument jako DOCX.",
    );
  }
  const kind = EXTENSIONS[extension];
  if (!kind) {
    throw new ConvexError(
      "Nieobsługiwany typ pliku. Dozwolone: PDF, DOCX, HTML i Markdown.",
    );
  }
  return kind;
}

export function parseFileInput(value: {
  title: string;
  fileName: string;
  scope: "national" | "office" | "unit";
  unit?: string | undefined;
  description?: string | undefined;
  checklist?: unknown;
}) {
  const common = parse(commonSchema, value);
  const { fileName } = parse(fileSchema, value);
  return { ...common, fileName, kind: fileKindOf(fileName) };
}

export function parseUrlInput(value: {
  url: string;
  title: string;
  scope: "national" | "office" | "unit";
  unit?: string | undefined;
  description?: string | undefined;
  checklist?: unknown;
}) {
  const common = parse(commonSchema, value);
  if (value.url.length > KNOWLEDGE_LIMITS.url) {
    throw new ConvexError(
      `Adres może mieć najwyżej ${KNOWLEDGE_LIMITS.url} znaków.`,
    );
  }
  const check = checkPublicHttpsUrl(value.url);
  if (!check.ok) throw new ConvexError(check.reason);
  return { ...common, url: check.url };
}

export function assertFileSize(size: number): void {
  if (size > KNOWLEDGE_LIMITS.maxFileBytes) {
    const mb = KNOWLEDGE_LIMITS.maxFileBytes / (1024 * 1024);
    throw new ConvexError(`Plik jest za duży: najwyżej ${mb} MB.`);
  }
  if (size === 0) throw new ConvexError("Plik jest pusty.");
}

// Complete means valid text and dates, and both confirmations given.
export function checklistComplete(checklist: unknown): boolean {
  const parsed = checklistSchema.safeParse(checklist);
  return (
    parsed.success &&
    parsed.data.polishLanguage &&
    parsed.data.publicationConsent
  );
}
