# Zgłoszenie: Azymut

Azymut to cyfrowy asystent ocen okresowych w służbie cywilnej. Jeden produkt odpowiada na dwa wyzwania:

- **Cyfrowy Asystent Ocen Okresowych** (KPRM, temat główny): [opis wyzwania](../wyzwanie/asystent-ocen-okresowych.md),
- **Kompas kompetencji** (Ministerstwo Cyfryzacji, rozszerzenie): [opis wyzwania](../wyzwanie/kompas-kompetencji.md).

## Linki

| Co                       | Adres                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Demo, wszystkie moduły   | <https://hacknation-2026-five.vercel.app/>                                              |
| Demo w profilu Asystent  | <https://hacknation-2026-five.vercel.app/?profil=asystent>                              |
| Demo w profilu Kompas    | <https://hacknation-2026-five.vercel.app/?profil=kompas>                                |
| Repozytorium (publiczne) | <https://github.com/Orfeliny/Hacknation-2026>                                           |
| Prezentacja KPRM (PDF)   | [prezentacje/asystent-kprm.pdf](prezentacje/asystent-kprm.pdf)                          |
| Prezentacja MC (PDF)     | [prezentacje/kompas-mc.pdf](prezentacje/kompas-mc.pdf)                                  |
| Deklaracja dostępności   | [deklaracja-dostepnosci.md](deklaracja-dostepnosci.md)                                  |
| Nagrania demo            | `wideo/` (osobne zadanie, [#32](https://github.com/Orfeliny/Hacknation-2026/issues/32)) |

Demo nie wymaga logowania. Rolę (przełożony, pracownik, kadry, dyrektor) wybiera się zakładką w nagłówku. Dane są fikcyjne.

## Dokumenty zgłoszenia

- [opis.md](opis.md): tytuł, problem, rozwiązanie, najważniejsze funkcje.
- [architektura.md](architektura.md): technologie, architektura, wdrożenie, integracje, bezpieczeństwo.
- [wykorzystanie-ai.md](wykorzystanie-ai.md): gdzie działa AI, czego AI nie robi, ochrona danych.
- [scenariusz-demo.md](scenariusz-demo.md): ścieżki demo krok po kroku dla obu wyzwań.
- [prezentacje/](prezentacje/): źródła HTML i pliki PDF obu prezentacji.

## Checklista wymagań formalnych

### KPRM: Cyfrowy Asystent Ocen Okresowych

| Wymaganie                                    | Gdzie                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Tytuł projektu                               | [opis.md](opis.md)                                                         |
| Opis proponowanego rozwiązania               | [opis.md](opis.md)                                                         |
| Identyfikacja problemu i sposobu rozwiązania | [opis.md](opis.md), sekcje „Problem” i „Rozwiązanie”                       |
| Prezentacja PDF, maks. 15 slajdów            | [prezentacje/asystent-kprm.pdf](prezentacje/asystent-kprm.pdf), 13 slajdów |
| Materiał demonstracyjny (prototyp)           | demo pod linkiem wyżej, [scenariusz-demo.md](scenariusz-demo.md)           |
| Opcjonalnie: repozytorium kodu               | link wyżej                                                                 |
| Opcjonalnie: dokumentacja techniczna         | [architektura.md](architektura.md), katalog [`docs/`](..)                  |

### MC: Kompas kompetencji

| Wymaganie                                           | Gdzie                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Działający prototyp, ścieżka przełożonego           | demo w profilu Kompas, [scenariusz-demo.md](scenariusz-demo.md)    |
| Krótki opis koncepcji i funkcji                     | [opis.md](opis.md)                                                 |
| Prezentacja, maks. 10 slajdów                       | [prezentacje/kompas-mc.pdf](prezentacje/kompas-mc.pdf), 10 slajdów |
| Opis wykorzystania AI                               | [wykorzystanie-ai.md](wykorzystanie-ai.md)                         |
| Technologie i architektura                          | [architektura.md](architektura.md)                                 |
| Kompletna ścieżka, model kompetencyjny, asystent AI | [scenariusz-demo.md](scenariusz-demo.md), ścieżka Kompas           |
| Linki aktywne bez dodatkowych uprawnień             | sprawdzić w oknie incognito przed wysłaniem (niżej)                |

## Przed wysłaniem

- [ ] Każdy link z tabeli „Linki” otwiera się w oknie incognito, bez logowania.
- [ ] Demo na produkcji przechodzi obie ścieżki z [scenariusz-demo.md](scenariusz-demo.md).
- [ ] Asystent na produkcji odpowiada z cytatem na 3 pytania z listy w scenariuszu i mówi „nie wiem” na pytanie spoza bazy.
- [ ] Odpowiedź mentorów MC w sprawie darmowych narzędzi AI wpisana w [wykorzystanie-ai.md](wykorzystanie-ai.md).
- [ ] Pliki PDF prezentacji wygenerowane z aktualnych źródeł (`node docs/zgloszenie/prezentacje/render-pdf.mjs`).
