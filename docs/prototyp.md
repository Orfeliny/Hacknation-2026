# Prototyp interfejsu: Azymut

Klikalny prototyp ekranów aplikacji do ocen okresowych. Powstał po wywiadach z DSC KPRM z 21.11.2026 ([wnioski](wyzwanie/wywiady-2026-11-21.md)) i po trzech recenzjach: workflow, dostępności i języka.

**Podgląd na żywo:** <https://claude.ai/artifact/WsCnh3cWqFQBzw8NrG6J8S>

Artefakt trzeba udostępnić w menu Share, żeby otworzyły go inne osoby. Pliki w [`prototyp/`](prototyp/) to kopia źródeł ekranów (format `.dc.html` edytora Design). Nie uruchamiają się poza artefaktem i służą jako archiwum oraz wzór dla implementacji w `src/features/`.

## Ekrany

| Rola         | Ekran                                                 | Plik                      |
| ------------ | ----------------------------------------------------- | ------------------------- |
| Przełożony   | Pulpit: „Do zrobienia” i „Czekasz na innych”          | `Main.dc.html`            |
| Przełożony   | Sporządzenie oceny (arkusz C), kontrola formalna      | `Review.dc.html`          |
| Przełożony   | Rozmowa oceniająca i bieżąca                          | `Rozmowa.dc.html`         |
| Przełożony   | Dziennik obserwacji                                   | `Observations.dc.html`    |
| Przełożony   | Zmiana oceniającego i zgoda na przekazanie obserwacji | `Handover.dc.html`        |
| Przełożony   | Wniosek o przesunięcie terminu                        | `ShiftDecision.dc.html`   |
| Przełożony   | Porady dla przełożonych                               | `Porady.dc.html`          |
| Pracownik    | Moja ocena w toku                                     | `EmployeeCycle.dc.html`   |
| Pracownik    | Zapoznanie i sprzeciw                                 | `EmployeeResult.dc.html`  |
| Kadry        | Panel kadr                                            | `HrOffice.dc.html`        |
| Kadry        | Przypisanie oceniającego                              | `HrAssign.dc.html`        |
| Kadry        | Karta pracownika: nieobecności, przesunięcia terminu  | `KartaPracownika.dc.html` |
| Kadry        | Ustawienia urzędu: AI, logowanie, import              | `Ustawienia.dc.html`      |
| Dyrektor     | Rozstrzygnięcie sprzeciwu                             | `Director.dc.html`        |
| Wszyscy      | Forum rozwoju                                         | `Forum.dc.html`           |
| Wszyscy      | Logowanie e-mailem w domenie urzędu                   | `Login.dc.html`           |
| Dokumentacja | Zasady i paleta                                       | `Zasady.dc.html`          |

## Zasady wyglądu

- Kolor główny to granat `#004E98`: przyciski, linki, obrys fokusu.
- Kolor statusu dostaje tylko tekst alertu i ikona obok niego. Karty i plakietki są neutralne.
  - czerwony `#B42318`: po terminie, blokuje, błąd
  - pomarańczowy `#B84A00`: wkrótce
  - niebieski `#3A6EA5`: termin przesunięty
  - zielony `#1E6B3A`: gotowe
- Plakietka „AI” z kropką pokazuje ustawienie urzędu. AI podpowiada pytania i kryteria, nigdy ocen.
- Wszystkie ekrany są tylko na komputer. Celem jest zgodność z WCAG 2.1 AA.

## Znane braki (do zrobienia)

Z recenzji końcowej. Poprawki przerwał limit użycia, więc te punkty są nadal otwarte:

- Brak ekranu „Kryteria i rozmowa rozpoczynająca”. Link przy Katarzynie prowadzi do rozmowy oceniającej z inną osobą.
- „Podgląd oceny” otwiera edytowalny szkic innej osoby. Potrzebny jest widok tylko do odczytu.
- Sprzeczne daty:
  - u pracownika rozmowa „odbyła się 26.11”, choć dziś jest 21.11;
  - termin sprzeciwu Tomasza;
  - liczba sprzeciwów w panelu kadr.
- Brak ekranu przeglądu pakietu dla następcy z wyborem pojedynczych wpisów.
- Brak panelu dokumentów wewnętrznych urzędu (regulaminy, zarządzenia, standardy), które zasilają bazę wiedzy asystenta (RAG). Dziś asystent cytuje tylko przepisy krajowe, a to nie wystarcza. Panel dla kadr i administratora: lista dokumentów, dodawanie pliku, zakres (cały urząd albo komórka), status indeksowania, data. Odpowiedź asystenta cytuje dokument urzędu osobno od przepisów. Dokumenty podlegają pseudonimizacji (#28), a indeksowanie ma działać też z lokalnym modelem (#26).
- Pracownik nie ma drogi powrotu z ekranu wyniku. Forum ma nawigację przełożonego.
- Dostępność:
  - stan AI widać tylko po kolorze kropki;
  - skala ocen nie używa natywnych pól radio;
  - przyciski na forum mają powtarzające się nazwy;
  - stopka nie ma linków, w tym do deklaracji dostępności.
- Język: formy żeńskie przy imionach, kilka kalk, różne formaty dat.

Do potwierdzenia przez prawnika: droga do sądu pracy przy ocenie pozytywnej, „fikcja zapoznania” a doręczenie oceny, moment, od którego obowiązuje nowy termin, podstawa ręcznego restartu cyklu.
