# Integracje zewnętrzne i ich atrapy

Każda integracja ma tryb atrapy (mock), który jest **domyślny**. Demo działa bez kont, kluczy i sieci.
Prawdziwą usługę włącza się jedną zmienną środowiska Convex (`npx convex env set ...`).

| Integracja                  | Moduł / issue                  | Zmienna              | Domyślnie (atrapa)                                  | Prawdziwa usługa                                                                          |
| --------------------------- | ------------------------------ | -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Model AI                    | `convex/ai`, moduły AI         | `AI_PROVIDER`        | `mock`: fikstury modułów (`mockFixture`)            | `openai-compatible` (Bielik, PLLuM, vLLM), wymaga `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` |
| Akty prawne (API ELI Sejmu) | `convex/regulationsWatch`, #41 | `REGULATIONS_SOURCE` | `mock`: zapis metadanych z 2026-11-21               | `eli`: publiczne API `api.sejm.gov.pl`, bez konta                                         |
| Poczta i kalendarz          | `convex/mail`, #37             | `MAIL_TRANSPORT`     | skrzynka demo w aplikacji, pliki `.ics` do pobrania | `smtp`: wiadomości czekają w kolejce; wysyłka wymaga osobnego PR z biblioteką SMTP        |
| Logowanie                   | `convex/lib/demoRole.ts`, #9   | brak                 | przełącznik roli demo                               | Keycloak + AD (#42), poza zakresem hackathonu                                             |

## Na demo

- Zmiana przepisów: akcja `regulationsWatch.actions.simulateAmendment` (rola kadr albo administratora) oznacza akt jako zmieniony, bez czekania na prawdziwą nowelizację.
- Przypomnienia: `hrDashboard.reminders.generate` przyjmuje `today`, więc można „przesunąć czas” bez zmiany zegara.
- Dane: `npx convex run employees/seed:run` tworzy fikcyjny urząd z jedną osobą na każdą rolę demo.

Testy nigdy nie łączą się z siecią: tryby prawdziwe są w nich zastąpione atrapą `fetch`.
