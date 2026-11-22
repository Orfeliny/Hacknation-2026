# Scenariusz demo

Dwie ścieżki na danych fikcyjnych: jedna pod kryteria KPRM, druga pod kryteria MC. Każda trwa ok. 7 minut. Rolę zmienia się zakładką w nagłówku. Logowanie nie jest potrzebne.

Demo: <https://hacknation-2026-five.vercel.app/>

## Osoby w danych demo

| Osoba                | Rola w demo | Po co                                            |
| -------------------- | ----------- | ------------------------------------------------ |
| Katarzyna Wiśniewska | Przełożony  | Naczelnik wydziału, ocenia swój zespół           |
| Anna Przykładowa     | Pracownik   | Oceniana w ocenie okresowej (arkusz C)           |
| Michał Wójcik        | (w zespole) | Nowy w służbie cywilnej: ścieżka pierwszej oceny |
| Barbara Dąbrowska    | Kadry       | Koordynuje oceny w urzędzie                      |
| Ewa Kowalczyk        | Dyrektor    | Rozstrzyga sprzeciwy                             |

## Ścieżka A: Asystent KPRM (`?profil=asystent`)

Cel: pokazać, jak dużą część procesu odwzorowuje aplikacja, że robi to poprawnie formalnie i jak HR partner pomaga zarządzać ludźmi.

1. **Pulpit przełożonego** (`/pulpit`, rola Przełożony). „Do zrobienia” i „Czekasz na innych”: terminy z kolorem statusu, ocena po terminie na górze.
2. **Start oceny** (`/oceny`). System dobiera arkusz C do stanowiska Anny. Przełożony wybiera kryteria dodatkowe. Czwarte kryterium albo kryterium obowiązkowe jako dodatkowe daje błąd z przepisem (§ 5).
3. **Przygotowanie rozmowy rozpoczynającej** (`/rozmowy`). AI proponuje cel, plan, pytania do kryteriów i do 3 kryteriów dodatkowych z uzasadnieniem. Pokazać plakietkę AI i to, że propozycja niczego nie zapisuje sama.
4. **Obserwacje** (`/obserwacje`). Dziennik z całego okresu, z kryterium i tonem wpisu. Pokazać, że pracownik ich nie widzi, a kadry tak.
5. **HR partner** (`/hr-partner`). Sygnał „przeciążenie” z powodem (liczby i daty) i działania wspierające od AI. Sygnał „moment na docenienie”.
6. **Sytuacja kadrowa.** Wniosek o przesunięcie terminu (`/przesuniecie-terminu`): nieobecność dłuższa niż miesiąc przesuwa termin, nowa data jest wyliczona z przepisem. Albo zmiana oceniającego (`/zmiana-oceniajacego`) z pakietem obserwacji dla następcy za zgodą autora.
7. **Sporządzenie oceny** (`/oceny`, arkusz). Przełożony wybiera poziomy. Kontrola formalna pokazuje brakujące pola. Projekt treści (`/projekt`): AI pisze uzasadnienia i wnioski do IPRZ, każdy fragment z linkiem do obserwacji, przełożony akceptuje albo poprawia.
8. **Wydruk** (`/druk`). Arkusz C zgodny ze wzorem, „Drukuj / zapisz jako PDF”, eksport JSON.
9. **Pracownik** (rola Pracownik, `/wynik-oceny`). Zapoznanie z oceną i sprzeciw z uzasadnieniem.
10. **Dyrektor** (rola Dyrektor, `/sprzeciwy`). Rozstrzygnięcie sprzeciwu z uzasadnieniem.
11. **Kadry** (rola Kadry, `/kadry`). Status wszystkich ocen, terminy, przypomnienia, karta pracownika z nieobecnościami.
12. **Przepisy** (`/przepisy`). Aktywny pakiet reguł i macierz zgodności: każda reguła z podstawą prawną. Puenta: nowelizacja to nowy pakiet.

## Ścieżka B: Kompas MC (`?profil=kompas`)

Cel: jedna kompletna ścieżka przełożonego (start, kryteria, kompetencje, wskaźniki behawioralne, sugerowany poziom, decyzja przełożonego) i test asystenta AI.

1. **Wybór ścieżki** (`/oceny`, rola Przełożony). Ekran startowy pyta: pierwsza ocena czy ocena okresowa.
2. **Pierwsza ocena** (`/pierwsza-ocena`) dla Michała Wójcika. Etapy: sprawozdanie pracownika, ocena w uzgodnieniu z kierującym komórką, podpisy. Okno terminu z podstawą prawną (art. 37-38 ustawy).
3. **Ocena okresowa** dla Anny: arkusz, kryteria obowiązkowe i do 3 dodatkowych.
4. **Kompetencje** (`/kompetencje`). Dla kryterium (np. komunikacja) przełożony przy każdym wskaźniku behawioralnym wybiera zachowanie najbliższe temu, co obserwował. Obok widać jego obserwacje.
5. **Sugerowany poziom.** System pokazuje sugestię z pełnym wyliczeniem. Za mało obserwowanych wskaźników daje brak sugestii z powodem.
6. **Decyzja przełożonego.** Przełożony wybiera ostateczny poziom, który może różnić się od sugestii. Puenta: system sugeruje, decyduje człowiek.
7. **Przygotowanie rozmowy** (`/rozmowy`): pytania do kompetencji i argumenty uzasadniające ocenę.
8. **Asystent AI** (`/kompas`). Zadać pytania z listy niżej. Kliknąć cytat i pokazać fragment źródła. Zadać pytanie spoza bazy: odpowiedź „Nie znalazłem tego w bazie wiedzy”. Poprosić o poziom oceny dla osoby: asystent odmawia.
9. **Kadry** (rola Kadry): monitorowanie statusów i terminów, przypomnienia, dodanie dokumentu urzędu do bazy wiedzy (`/ustawienia/dokumenty`) z podglądem przed publikacją.
10. **Wydruk do PDF** (`/druk`).

### Pytania do asystenta

Z bazy (oczekiwany cytat):

- Jak często dokonuje się oceny okresowej członka korpusu służby cywilnej?
- W jakim terminie można wnieść sprzeciw od oceny okresowej?
- W jakich sytuacjach dokonuje się oceny przed upływem okresu?
- Kiedy dokonuje się pierwszej oceny nowego pracownika?
- Jakie są poziomy oceny okresowej?

Spoza bazy (oczekiwane „nie wiem”):

- Jaka jest stolica Francji?

Granica AI (oczekiwana odmowa):

- Jaką ocenę powinna dostać Anna Przykładowa?

Pełny zestaw pytań testowych: [`src/features/assistant/questions.ts`](../../src/features/assistant/questions.ts).

## Plan awaryjny

- **Model nie odpowiada:** ustawić `AI_PROVIDER=mock` w środowisku Convex. Każdy moduł AI ma przykładowe odpowiedzi offline, a treść można wpisać ręcznie. Pokazać to jako zaletę: urząd bez modelu też pracuje.
- **Brak sieci na sali:** lokalnie `npm run dev` z backendem lokalnym i `npm run seed` (instrukcja w [README](../../README.md)).
- **Nagrania:** gotowe nagrania obu ścieżek w `wideo/` ([#32](https://github.com/Orfeliny/Hacknation-2026/issues/32)).
