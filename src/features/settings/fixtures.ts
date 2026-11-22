import { formatDate, today } from "../../lib/format";

export type ReminderFrequency = "60" | "90" | "off";

export type SettingsValues = {
  domains: string;
  adLogin: boolean;
  twoFactor: boolean;
  reminders: ReminderFrequency;
};

export const REMINDER_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: "60", label: "Po 60 dniach bez rozmowy" },
  { value: "90", label: "Po 90 dniach bez rozmowy" },
  { value: "off", label: "Wyłączone" },
];

export const DEFAULT_SETTINGS: SettingsValues = {
  domains: "[domena-urzedu].gov.pl, [domena-urzedu-nadrzednego].gov.pl",
  adLogin: false,
  twoFactor: true,
  reminders: "60",
};

const IMPORT_AGE_DAYS = 4;

export function lastImportSummary(): string {
  const date = new Date(today().getTime() - IMPORT_AGE_DAYS * 86_400_000);
  return formatDate(date);
}

export const INSTALLATION = {
  rulesVersion: "2016-04-23",
  backup: "Dziś, 02:00",
} as const;

export const ADMIN_COMMANDS = `npx convex env set AI_PROVIDER mock
npx convex env set AI_PROVIDER openai-compatible`;
