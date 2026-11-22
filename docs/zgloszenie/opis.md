# Azymut: cyfrowy asystent ocen okresowych

**Tytuł projektu:** Azymut, asystent ocen okresowych i kompas kompetencji dla służby cywilnej.

**W jednym zdaniu:** Azymut prowadzi przełożonego, pracownika i kadry przez całą ocenę okresową i pierwszą ocenę, pilnuje terminów i przepisów, a AI podpowiada pytania, treść i działania rozwojowe, nigdy nie wystawiając oceny.

## Problem

Ocena okresowa obejmuje ok. 123 tys. osób w ok. 1743 urzędach. Dziś zwykle wygląda tak:

- **Papier.** Arkusze wypełnia się ręcznie albo w edytorze tekstu, a obieg podpisów jest papierowy.
- **Terminy i przesunięcia.** Według DSC KPRM najczęstsze błędy to oceny po terminie i źle policzone przesunięcia terminu (np. przy nieobecności dłuższej niż miesiąc), a nie treść formularza.
- **24 miesiące pamięci.** Przełożony pamięta ostatnie trzy miesiące. Bez notatek z całego okresu ocena opiera się na wrażeniu.
- **Kompetencje bez zachowań.** Pojęcia takie jak „komunikacja” czy „współpraca” są szerokie. Różni przełożeni różnie przekładają obserwacje na poziom oceny.
- **Rozmowa i rozwój.** Trudno przygotować dobrą informację zwrotną, wybrać kryteria dodatkowe i napisać sensowne wnioski do IPRZ (indywidualnego programu rozwoju zawodowego).
- **Dobrostan.** Sygnały przeciążenia, braku docenienia czy długiej nieobecności giną między ocenami.
- **Urzędy są różne.** Od ministerstwa z serwerownią po inspektorat z pięcioma osobami. Jedno centralne rozwiązanie w chmurze nie pasuje wszystkim.

Źródła: opisy wyzwań w [`docs/wyzwanie/`](../wyzwanie/) i dwa wywiady z DSC KPRM z 21.11.2026 ([wnioski](../wyzwanie/wywiady-2026-11-21.md)).

## Rozwiązanie

Azymut to aplikacja w przeglądarce dla czterech ról: przełożonego, pracownika, kadr i dyrektora generalnego. Odwzorowuje proces z rozporządzenia PRM z 4.04.2016 i ustawy o służbie cywilnej, krok po kroku, z kontrolą formalną na każdym etapie.

Trzy zasady:

1. **Przepisy to dane, nie kod.** Terminy, arkusze, kryteria, skala ocen i model kompetencyjny są w wersjonowanych pakietach z podstawą prawną przy każdej regule. Nowelizacja to nowy pakiet, bez przebudowy systemu.
2. **AI podpowiada, przełożony decyduje.** AI proponuje pytania, kryteria dodatkowe, projekt uzasadnień i działania rozwojowe. Nigdy nie proponuje poziomu oceny. Blokuje to warstwa zabezpieczeń, nie tylko polecenie dla modelu.
3. **Działa w każdym urzędzie.** Mały urząd uruchamia wersję bazową bez modelu AI (tryb `mock` i ręczna edycja). Duży stawia całość u siebie w Docker Compose, z własnym modelem i logowaniem przez Keycloak lub Active Directory.

## Najważniejsze funkcje

### Proces oceny okresowej

- Wybór arkusza A, B lub C według rodzaju stanowiska i maksymalnie 3 kryteriów dodatkowych, z kontrolą reguł § 5.
- Rozmowa rozpoczynająca, obserwacje przez cały okres, rozmowa oceniająca, sporządzenie oceny, zapoznanie, sprzeciw i jego rozstrzygnięcie przez dyrektora generalnego.
- Kontrola formalna arkusza: brakujące pola i błędy wskazane po polsku, z przepisem.
- Terminy liczone według przepisów: miesiące, dni wolne, święta. Nieprzerwana nieobecność dłuższa niż miesiąc przesuwa termin. Wniosek o przesunięcie terminu ma wyliczoną nową datę.
- Sytuacje kadrowe: zmiana oceniającego, pakiet obserwacji dla następcy (tylko za zgodą autora), długa nieobecność, zmiana zadań, ręczny restart cyklu.
- Wydruk arkusza zgodny ze wzorem z rozporządzenia, zapis do PDF, eksport JSON do EZD lub systemu kadrowego.
- Podpis elektroniczny poza systemem (profil zaufany, podpis osobisty lub kwalifikowany) i weryfikacja, że wgrany PDF jest podpisany.
- Przypomnienia o terminach dla przełożonych i kadr, skrzynka powiadomień demo z plikiem kalendarza `.ics`.
- Panel kadr: status wszystkich ocen, terminy, przypisanie oceniającego, karta pracownika z nieobecnościami.
- Rejestr zdarzeń: kto, co i kiedy zmienił, w tym każde wywołanie AI.

### Wirtualny HR partner

- Sześć rodzajów sygnałów z jawnych reguł: przeciążenie, brak docenienia, zmiana zadań, długa nieobecność, zmiana przełożonego, moment na docenienie.
- Przy każdym sygnale powód z liczbami i datami, a do tego działania wspierające proponowane przez AI: rozmowa, zmiana priorytetów, podział zadań, mentoring.
- Kadry widzą tylko liczby sygnałów w zespołach, bez nazwisk i treści.

### Kompas kompetencji

- Dwie osobne ścieżki: pierwsza ocena (art. 37-38 ustawy, ze sprawozdaniem pracownika i uzgodnieniem z kierującym komórką) i ocena okresowa.
- Model kompetencyjny ze wskaźnikami behawioralnymi. Przełożony wybiera zachowanie najbliższe temu, co obserwował. System liczy sugerowany poziom i pokazuje całe wyliczenie. Ostateczny poziom wybiera przełożony.
- Asystent AI z bazą wiedzy: przepisy pobrane z ELI i gov.pl oraz dokumenty dodane przez kadry (poradniki, model kompetencyjny, regulaminy urzędu). Każda odpowiedź ma cytat ze źródłem albo jawne „Nie znalazłem tego w bazie wiedzy”.
- Kadry dodają dokumenty urzędu (PDF, DOCX, HTML, Markdown lub link do eli.gov.pl) z podglądem przed publikacją i wersjami po nowelizacji.

### Wsparcie rozwoju

- Przygotowanie do rozmów: cel, plan, pytania do każdego kryterium, podpowiedzi do trudnych sytuacji.
- Projekt treści oceny: uzasadnienia, mocne strony, obszary do rozwoju, wnioski do IPRZ. Każdy fragment wskazuje obserwację, na której się opiera. Przełożony akceptuje, poprawia albo odrzuca każdy fragment.
- Katalog form rozwoju, porady dla przełożonych i forum wymiany doświadczeń z moderacją kadr.

## Dla kogo

| Rola       | Co dostaje                                                                        |
| ---------- | --------------------------------------------------------------------------------- |
| Przełożony | Pulpit zadań, prowadzenie przez ocenę, obserwacje, rozmowy, HR partner, Kompas    |
| Pracownik  | Wgląd w kryteria, termin i ocenę, zapoznanie, sprzeciw, własne notatki            |
| Kadry      | Status i terminy wszystkich ocen, przypomnienia, nieobecności, baza wiedzy urzędu |
| Dyrektor   | Rozstrzyganie sprzeciwów, zbiorcze statystyki                                     |

## Dwa warianty zgłoszenia

Aplikacja ma przełącznik profilu (`?profil=asystent` albo `?profil=kompas`). Profil zmienia menu i ekran startowy, a kod pozostaje ten sam.

- **Asystent (KPRM):** pełny proces oceny okresowej, sytuacje kadrowe, wirtualny HR partner, wdrożenie on-premise.
- **Kompas (MC):** dwie ścieżki oceny, model kompetencyjny z sugerowanym poziomem, asystent AI z cytowaniem źródeł, monitorowanie terminów przez kadry.

## Stan prototypu i ograniczenia

Uczciwie, co jest prototypem:

- Logowanie: demo działa z przełącznikiem ról. Logowanie przez Keycloak (OIDC, z Active Directory w tle) jest zaimplementowane i opisane w [specs/oidc-keycloak.md](../../specs/oidc-keycloak.md), ale demo dla jury go nie wymaga.
- Opisy zachowań na poszczególnych poziomach w modelu kompetencyjnym napisał zespół i aplikacja oznacza je jako dane demonstracyjne. Kryteria i wskaźniki pochodzą z załącznika 1 do rozporządzenia. Oficjalny model podmienia się jako plik danych.
- Kilka interpretacji prawnych wymaga potwierdzenia przez prawnika, m.in. moment, od którego obowiązuje nowy termin, i podstawa ręcznego restartu cyklu. Lista jest w [docs/prototyp.md](../prototyp.md).
- Integracje z EZD i systemami kadrowymi są przygotowane jako eksport JSON z opisanym schematem, nie jako działające połączenia.

Pełna lista zabezpieczeń do zrobienia przed produkcją jest w [docs/on-premise.md](../on-premise.md).
