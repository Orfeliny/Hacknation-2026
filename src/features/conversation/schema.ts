import { z } from "zod";

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const scheduleFormSchema = z.object({
  startsAt: z
    .string()
    .regex(DATE_TIME, "Podaj datę i godzinę rozmowy.")
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "Podaj poprawny termin.",
    ),
  durationMinutes: z
    .number({ error: "Podaj czas trwania w minutach." })
    .int("Podaj pełne minuty.")
    .min(15, "Rozmowa trwa co najmniej 15 minut.")
    .max(480, "Rozmowa trwa najwyżej 8 godzin."),
  location: z.string().trim().max(200, "Miejsce może mieć do 200 znaków."),
});

export type ScheduleForm = z.infer<typeof scheduleFormSchema>;

export function outcomesFormSchema(todayIso: string) {
  return z.object({
    heldOn: z
      .string()
      .regex(DATE, "Podaj datę rozmowy.")
      .refine(
        (value) => value <= todayIso,
        "Rozmowa nie mogła odbyć się w przyszłości.",
      ),
    outcomes: z.string().max(5000, "Ustalenia mogą mieć do 5000 znaków."),
  });
}

export function firstError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
