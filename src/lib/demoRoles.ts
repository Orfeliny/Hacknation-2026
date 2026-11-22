import type { DemoRole } from "../../convex/lib/validators";

export type { DemoRole };

// Demo stand-in for login: the role picked in the header, kept per browser. Replaced by OIDC in #42.
export const DEMO_ROLES: {
  value: DemoRole;
  label: string;
  tabLabel: string;
}[] = [
  { value: "supervisor", label: "przełożony", tabLabel: "Przełożony" },
  { value: "employee", label: "oceniany", tabLabel: "Pracownik" },
  { value: "hr", label: "kadry", tabLabel: "Kadry" },
  { value: "director", label: "dyrektor", tabLabel: "Dyrektor" },
  { value: "admin", label: "administrator", tabLabel: "Administrator" },
];

export const DEMO_ROLE_VALUES = [
  "supervisor",
  "employee",
  "hr",
  "director",
  "admin",
] as const satisfies readonly DemoRole[];

// Must match the `demoPersona` employees in convex/employees/seed.ts (a test keeps them equal).
export const DEMO_PERSONAS: Record<
  DemoRole,
  { name: string; position: string }
> = {
  supervisor: {
    name: "Katarzyna Wiśniewska",
    position: "Naczelnik Wydziału Kontroli Planowej",
  },
  employee: { name: "Anna Przykładowa", position: "Główny specjalista" },
  hr: { name: "Barbara Dąbrowska", position: "Główny specjalista ds. kadr" },
  director: { name: "Ewa Kowalczyk", position: "Dyrektor Generalny" },
  admin: { name: "Łukasz Pawlak", position: "Informatyk" },
};

export const DEFAULT_DEMO_ROLE: DemoRole = "supervisor";
export const DEMO_ROLE_STORAGE_KEY = "demoRole";
