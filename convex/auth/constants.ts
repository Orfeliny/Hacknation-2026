import type { DemoRole } from "../lib/validators";

// Same order as the role tabs in the header.
export const DEMO_ROLES_ALL: readonly DemoRole[] = [
  "supervisor",
  "employee",
  "hr",
  "director",
  "admin",
];

export const AUTH_REFUSALS = {
  unauthenticated: "Zaloguj się, żeby korzystać z aplikacji.",
  not_linked:
    "Twoje konto nie jest powiązane z pracownikiem. Zgłoś się do kadr, żeby sprawdzić adres e-mail w danych kadrowych.",
  ambiguous_email:
    "Ten adres e-mail jest przypisany do kilku pracowników. Zgłoś się do kadr.",
  already_linked:
    "Pracownik z tym adresem e-mail jest już powiązany z innym kontem. Zgłoś się do kadr.",
  email_not_verified:
    "Adres e-mail twojego konta nie jest potwierdzony. Potwierdź go w Keycloaku i zaloguj się ponownie.",
  domain_not_allowed:
    "Adres e-mail twojego konta jest spoza domen dopuszczonych w urzędzie.",
  role_not_allowed: "Nie masz dostępu do tej roli.",
  misconfigured:
    "Logowanie jest źle skonfigurowane. Zgłoś to administratorowi.",
} as const;

export type AuthRefusal = keyof typeof AUTH_REFUSALS;
