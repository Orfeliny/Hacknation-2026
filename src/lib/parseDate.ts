import { z } from "zod";

const parts = z
  .string()
  .trim()
  .regex(/^\d{1,2}\.\d{1,2}\.\d{4}$/)
  .transform((text) => {
    const [day = 0, month = 0, year = 0] = text.split(".").map(Number);
    return { day, month, year };
  })
  .refine(({ day, month, year }) => {
    const probe = new Date(Date.UTC(year, month - 1, day));
    return (
      probe.getUTCFullYear() === year &&
      probe.getUTCMonth() === month - 1 &&
      probe.getUTCDate() === day
    );
  })
  .transform(({ day, month, year }) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}`;
  });

export function parsePolishDate(text: string): string | null {
  const result = parts.safeParse(text);
  return result.success ? result.data : null;
}
