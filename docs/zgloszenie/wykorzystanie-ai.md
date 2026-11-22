# Wykorzystanie sztucznej inteligencji

Ten dokument odpowiada na wymóg Kompasu („opis wykorzystania sztucznej inteligencji, wskazujący, w których elementach została wykorzystana”) i opisuje AI w aplikacji Azymut. Na końcu jest krótka informacja o tym, jak zespół używał AI przy budowie projektu.

## Zasada nadrzędna

**AI doradza, przełożony decyduje.** Żaden moduł nie proponuje poziomu oceny pracownika. Tak umówiliśmy się z DSC KPRM w wywiadach z 21.11.2026 i tego wymaga opis Kompasu. Zasadę pilnują trzy warstwy:

1. Polecenie dla modelu zabrania proponowania ocen.
2. Warstwa zabezpieczeń sprawdza każdą odpowiedź modelu i blokuje taką, która proponuje albo stwierdza poziom oceny (np. „proponuję ocenę: powyżej oczekiwań”). Opis zasad, w którym pada nazwa poziomu, przechodzi.
3. Interfejs nie ma miejsca, w którym AI wpisuje ocenę. Poziom zawsze wybiera człowiek.

## Gdzie działa AI

| Moduł                           | Co robi AI                                                                                                                                                                                                                                                                                  | Czego AI nie robi                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asystent z bazą wiedzy (Kompas) | Odpowiada na pytania o zasady oceny na podstawie fragmentów przepisów i dokumentów urzędu. Każda odpowiedź ma cytat ze źródłem.                                                                                                                                                             | Nie odpowiada z własnej wiedzy. Gdy w bazie nie ma odpowiedzi, mówi „Nie znalazłem tego w bazie wiedzy”. Odmawia wskazania poziomu oceny konkretnej osoby. |
| Przygotowanie do rozmów         | Proponuje cel rozmowy, plan, pytania do każdego kryterium, podpowiedzi do trudnych sytuacji i do 3 kryteriów dodatkowych z uzasadnieniem.                                                                                                                                                   | Nie zapisuje kryteriów sam. Propozycja trafia do przełożonego.                                                                                             |
| Projekt treści oceny            | Na podstawie ocen wybranych przez przełożonego i jego obserwacji pisze projekt uzasadnień, mocnych stron, obszarów do rozwoju i wniosków do IPRZ. Każdy fragment wskazuje obserwację, na której się opiera. Sygnalizuje niespójność, np. wysoką ocenę przy samych negatywnych obserwacjach. | Nie powstaje przed wybraniem ocen przez przełożonego. Każdy fragment trzeba zaakceptować, poprawić albo odrzucić.                                          |
| Wirtualny HR partner            | Do sygnału z reguł (np. przeciążenie, brak docenienia) proponuje działania wspierające: rozmowę, zmianę priorytetów, podział zadań, mentoring. Odpowiada na pytania przełożonego o sytuację w zespole.                                                                                      | Nie wykrywa sygnałów. Sygnały liczą jawne reguły z progami i datami, nie model. Nie stawia diagnoz.                                                        |

### Co liczą reguły, a nie AI

Część „inteligencji” to celowo zwykłe, sprawdzalne reguły. Wynik musi być powtarzalny i dać się wytłumaczyć:

- **Sugerowany poziom kompetencji w Kompasie** liczy deterministyczny algorytm (mediana wybranych zachowań, minimalny odsetek obserwowanych wskaźników), a ekran pokazuje całe wyliczenie. Bez modelu językowego.
- **Sygnały HR partnera** to sześć reguł z progami, np. trzy obserwacje dotyczące dobrostanu w ciągu 42 dni.
- **Terminy, przesunięcia i kontrola formalna arkusza** wynikają z pakietu reguł prawnych.

## Baza wiedzy asystenta (RAG)

RAG (retrieval-augmented generation) to sposób, w którym model najpierw dostaje znalezione fragmenty dokumentów, a dopiero potem pisze odpowiedź, i to tylko na ich podstawie.

- **Źródła:** zestaw startowy to 17 źródeł: ustawa o służbie cywilnej, rozporządzenia wykonawcze, Kodeks pracy i inne akty pobierane z ELI oraz strony gov.pl o ocenach ([docs/knowledge-seed.md](../knowledge-seed.md)). Poradnik KPRM, model kompetencyjny, zestaw pytań i odpowiedzi oraz dokumenty wewnętrzne urzędu kadry dodają tą samą drogą.
- **Import:** kadry dodają plik (PDF, DOCX, HTML, Markdown) albo link, np. do eli.gov.pl. System zamienia dokument na tekst, dzieli go na fragmenty z metadanymi (dokument, artykuł, paragraf) i pokazuje podgląd przed publikacją. Nowelizacja tworzy nową wersję, a stara przestaje być cytowana.
- **Zakres:** dokumenty ogólnopolskie, całego urzędu i jednej komórki. Asystent szuka tylko w aktywnych dokumentach, które dotyczą pytającego.
- **Wyszukiwanie:** embeddingi `bge-m3` w indeksie wektorowym Convex. Fragment poniżej progu trafności nie trafia do modelu. Próg dobraliśmy na zestawie pytań testowych, w tym pytaniach spoza bazy.
- **Odpowiedź:** model zwraca treść i listę cytowanych fragmentów w sprawdzanym schemacie. Odpowiedź bez cytatu nie jest pokazywana. W jej miejsce pojawia się „Nie znalazłem tego w bazie wiedzy”. Kliknięcie cytatu otwiera fragment źródła.

## Modele

| Zastosowanie | Model                            | Gdzie działa                                                                                                                   |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Czat         | PLLuM 12B (polski model otwarty) | Demo: serwer vLLM na Modal.com ([`infra/modal_llm.py`](../../infra/modal_llm.py)). On-premise: Ollama lub vLLM w sieci urzędu. |
| Embeddingi   | `bge-m3`                         | Ten sam serwer co czat albo Ollama on-premise.                                                                                 |
| Bez modelu   | `mock`                           | Domyślny tryb. Przykładowe odpowiedzi offline, wszystko można wpisać ręcznie.                                                  |

Model wybiera się zmiennymi środowiskowymi backendu: `AI_PROVIDER`, a dla prawdziwego modelu także adres, nazwa modelu i klucz. Kod się nie zmienia. Pasuje każdy serwer zgodny z OpenAI API, także Bielik. Nie ma automatycznego przełączania między dostawcami: gdy model nie odpowiada, użytkownik dostaje czytelny komunikat, a ekran działa dalej w trybie ręcznym. Strona `/model-ai` pokazuje, który model przetwarza dane i czy dane zostają w sieci urzędu.

W wywiadach DSC prosiło, żeby nie zakładać lokalnego modelu jako jedynej drogi, bo mały urząd go nie postawi. Dlatego są trzy drogi: bez modelu, model lokalny albo model hostowany z pseudonimizacją.

## Bezpieczeństwo AI

- **Pseudonimizacja.** Przed wysłaniem do modelu imię i nazwisko pracownika (także w odmienionych formach) zastępuje znacznik `[PRACOWNIK]`. Przygotowanie rozmów dodatkowo usuwa numery PESEL i adresy e-mail. Po odpowiedzi backend zamienia znacznik z powrotem na imię i nazwisko. Model ich nie widzi.
- **Minimalizacja.** HR partner wysyła do modelu same fakty (rodzaj sygnału, liczby, daty), bez treści notatek. Przygotowanie rozmowy używa tylko obserwacji, które autor może czytać, z bieżącego okresu.
- **Ochrona przed wstrzyknięciem poleceń.** Tekst użytkownika trafia do modelu jako oznaczony blok danych. Znane frazy wstrzyknięć (po polsku i angielsku) są zastępowane, a odpowiedź z wyciekiem polecenia systemowego jest blokowana.
- **Rejestr.** Każde wywołanie AI trafia do rejestru: kto, kiedy, jaki moduł, jaki model.
- **Fragmenty dokumentów** w bazie wiedzy nie są pseudonimizowane, bo to akty prawne i regulaminy. Podgląd przed publikacją ostrzega kadry, żeby nie wgrywały dokumentów z danymi osobowymi.

### Znane ograniczenia

- Pseudonimizacja obejmuje pracownika i oceniającego. Nazwisko innej osoby wpisane w treść obserwacji nie jest zastępowane. Przełożony i tak przegląda każdy fragment, a pełne rozwiązanie jest w backlogu ([#128](https://github.com/Orfeliny/Hacknation-2026/issues/128)).
- Usuwanie numerów PESEL i adresów e-mail działa dziś tylko w przygotowaniu rozmów. Projekt treści, HR partner i asystent zamieniają tylko imiona i nazwiska. Do zrobienia: przenieść to do wspólnej warstwy pseudonimizacji.
- Wykrywanie propozycji oceny w odpowiedzi to heurystyka (wzorce słów), a nie drugi model. Uzupełniają je polecenie systemowe i interfejs bez pola dla AI.
- Przed wdrożeniem produkcyjnym trzeba wybrać model i hosting zgodny z polityką urzędu (dane w sieci urzędu albo umowa powierzenia) i powtórzyć pomiar trafności na docelowej bazie wiedzy.

## AI przy budowie projektu

Zespół pisał kod z pomocą asystentów AI do programowania. Agenci przygotowywali zmiany w osobnych gałęziach, a każda zmiana przechodziła przegląd (drugi agent i człowiek), pełny zestaw testów w CI i decyzję człowieka o scaleniu. Reguły pracy agentów są jawne w [CLAUDE.md](../../CLAUDE.md).

> Do uzupełnienia przed wysłaniem: odpowiedź mentorów MC, czy wymóg „wyłącznie darmowe narzędzia AI” dotyczy modeli w prototypie, czy także narzędzi zespołu. Aplikacja używa tylko otwartych modeli (PLLuM, `bge-m3`) i trybu `mock`.
