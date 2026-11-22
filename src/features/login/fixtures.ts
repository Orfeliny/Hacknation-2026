import { z } from "zod";
import type { DemoRole } from "../../lib/demoRole";

export const ALLOWED_DOMAINS = ["urzad.example", "urzad-nadrzedny.example"];

export const DEMO_CODE = "123456";

export const FIXTURE_ACCOUNTS: { email: string; role: DemoRole }[] = [
  { email: "katarzyna.wisniewska@urzad.example", role: "supervisor" },
  { email: "anna.przykladowa@urzad.example", role: "employee" },
  { email: "barbara.dabrowska@urzad.example", role: "hr" },
  { email: "ewa.kowalczyk@urzad.example", role: "director" },
  { email: "lukasz.pawlak@urzad.example", role: "admin" },
];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Wpisz adres e-mail w formacie imie.nazwisko@domena."))
  .refine(
    (value) => ALLOWED_DOMAINS.includes(value.split("@")[1] ?? ""),
    "Ten adres jest spoza domeny urzędu ani urzędu nadrzędnego.",
  );

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Kod ma 6 cyfr.");

export function findAccount(email: string) {
  return FIXTURE_ACCOUNTS.find((account) => account.email === email);
}
