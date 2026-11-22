# RAG: decyzje, otwarte pytania i ryzyka

Stan na 2026-11-22. Projekt: [specs/knowledge-rag.md](../specs/knowledge-rag.md), wdrożenie i pomiary:
[docs/rag.md](rag.md), zadania: etykieta `rag` (issue [#86](https://github.com/Orfeliny/Hacknation-2026/issues/86)
i RAG-1..RAG-7). Ten plik zbiera to, co łatwo zgubić: co ustalono, co czeka na człowieka i co może się nie udać.

## Co jest zrobione

| Zadanie                                                | Stan                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kontrakt (embeddingi, tabele, `vectorIndex`)           | scalone (#110)                                                                                                                                             |
| RAG-1 import i parsowanie (#112)                       | scalone, zamknięte                                                                                                                                         |
| RAG-2 fragmenty, embeddingi, wersje, publikacja (#113) | scalone, zamknięte                                                                                                                                         |
| RAG-3 `ask` i wyszukiwanie (#114)                      | scalone (#139)                                                                                                                                             |
| RAG-4 zestaw startowy (#115)                           | kod importu scalony (#140); import lokalny na prawdziwych danych udał się po ponowieniu (ustawa o służbie cywilnej padła za pierwszym razem, patrz ryzyka) |
| RAG-5 podpięcie pod Kompas i szkic oceny (#116)        | nie ruszone                                                                                                                                                |
| RAG-6 strojenie progu na prawdziwym korpusie (#121)    | pomiar i próg 0,35 gotowe (PR z skryptem, 40 pytaniami i wynikiem w `specs/knowledge-rag.md`); odpowiedź modelu czatu niezmierzona                         |
| RAG-7 serwer embeddingów i dokumentacja (#122)         | dokumentacja scalona (#143); produkcja i bundle w chmurze nie                                                                                              |

## Decyzje

- **Zostajemy przy Convex** (`vectorIndex` i `ctx.vectorSearch`), bez pgvector i bez dodatkowych baz. Zweryfikowane na
  lokalnym backendzie i na obrazie self-hosted z `docker-compose.yml`.
- **Model embeddingów: `bge-m3`, 1024 wymiary, stałe** (wymiar jest w indeksie). Zmiana modelu o innym wymiarze to
  przebudowa indeksu i ponowne embeddingi; `embeddingModel` jest zapisany na dokumencie.
- **Parsowanie po stronie serwera** (`turndown`, `unpdf`, `mammoth`). `.doc` odrzucany ("zapisz jako DOCX"), skany PDF
  trafiają do `needs_fix`, bez OCR.
- **Tekst do embeddingu idzie bez pseudonimizacji** (dokument nie jest poleceniem dla modelu, a przepisany fragment
  nie zgadzałby się z zapisanym). Treść dokumentu trafia do modelu odpowiedzi tylko przez wspólne guardrails (#28).
- **Zakresy dokumentów:** `national` (przepisy ogólnopolskie, cytowane jako `law`), `office`, `unit`. Dokument
  jednostki widzą tylko jej pracownicy.
- **Konflikt źródeł** to reguła na zakresach i wynikach (krajowe obok urzędu, różnica wyników do 0,1), nie ocena AI.
- **`remove` opublikowanej wersji przywraca poprzednią**, tak jak `withdraw`. Przywrócona wersja dostaje nowe
  `publishedAt` (bez nowego pola w tabeli).
- **Podział prac:** pipeline (RAG-2, RAG-4) robi Kamil, wyszukiwanie i konfigurację (RAG-3, RAG-6, RAG-7) Igor z agentem.

## Do decyzji człowieka

1. **Gdzie hostujemy `bge-m3` na produkcji:** ten sam host co czat (#96, Modal.com), osobny serwer z Ollamą, czy
   hostowane API zgodne z OpenAI. Do czasu decyzji produkcja zostaje na trybie `mock` (RAG działa, ale trafność jest
   przybliżona, nie semantyczna).
2. **Wspólny `AI_BASE_URL` i klucz dla czatu i embeddingów** (`convex/ai/config.ts`). Jeśli host z #96 nie obsługuje
   `/v1/embeddings`, potrzebna jest osobna zmienna w adapterze (zmiana w `convex/ai/**`, osobny PR kontraktowy).
3. **Serwis Ollama z `bge-m3` w `docker-compose.yml`** (automatyczne pobranie modelu): plik wspólny, osobny PR po
   zgodzie zespołu. Dziś to ręczny krok z `docs/rag.md`.
4. **Wykrywanie zmiany modelu embeddingów** i ponowne przeliczenie: nie zrobione, do ustalenia przy RAG-6 albo później.
5. **Czy #15 (szkic oceny) wraca do otwartych:** PR #85 zamknął je przez `Closes #15`, choć miało zostać otwarte ze
   względu na RAG (powiązanie pokrywa RAG-5, #116).

## Ryzyka

| Ryzyko                                                                                                                                                                | Skutek                                                                                                    | Co robić                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indeksowanie na CPU: paczka 64 fragmentów trwa ok. 44 s, domyślny `AI_TIMEOUT_MS` to 20 s                                                                             | import kończy się `timeout`                                                                               | `AI_TIMEOUT_MS=120000` (maksimum) albo GPU; sprawdzić, jak poszedł import w RAG-4                                                                        |
| `chunkCount` w `list` czyta wszystkie fragmenty z wektorami (8 KB każdy)                                                                                              | `list` przekroczy limit odczytu Convex (ok. 16 MiB) przy 17 aktach                                        | opcjonalne pole `chunkCount` na dokumencie, ustawiane przy `markIndexed` (mały PR kontraktowy); poprosiłem Kamila w #113                                 |
| Dokument zawisa w `indexing`, gdy akcja padnie w trakcie                                                                                                              | nic go nie ponowi                                                                                         | przejście do `failed` po czasie albo ponowienie przez kadry; poprosiłem Kamila w #113                                                                    |
| Nieaktywne fragmenty (stare wersje, niepublikowane) zalewają kandydatów wyszukiwania                                                                                  | fałszywe "Nie znalazłem tego w bazie wiedzy" przy dużej liczbie starych wersji                            | pole łączące `scope` i `active` w indeksie (zmiana pliku wspólnego); na razie 128 kandydatów na zakres                                                   |
| Próg trafności 0,35 nie rozdziela pytań spoza bazy (wyniki do 0,49) od poprawnych trafień (0,3–0,5); 3 z 8 pytań spoza bazy trafia do modelu                          | model dostaje nieistotne źródła                                                                           | druga linia obrony to `found: false` w odpowiedzi modelu; zmierzyć na prawdziwym modelu czatu przed demo                                                 |
| Trafność na prawdziwym korpusie jest przeciętna (po poprawce chunkera z #157: właściwy akt w top-1 59%, w top-3 76%; dokładny przepis w top-6 tylko dla 3 z 10 pytań) | asystent myli przepisy w obrębie właściwego aktu                                                          | wyszukiwanie hybrydowe (wektory plus indeks pełnotekstowy) i reranker to pierwsze środki; więcej pytań od innych osób; pomiar po każdej zmianie chunkera |
| Limit zapisu 4 MiB/s lokalnego backendu (`Too many writes per second` w `ingest:insertChunks` i `indexing:setActive`)                                                 | równoległy import kilku dokumentów wywraca najcięższy z nich (ustawa o służbie cywilnej dostała `failed`) | mniejsze paczki zapisu albo ponawianie po tym błędzie; import dokumentów po kolei; sprawdzić limity na chmurowym Convex                                  |
| Tryb `mock` nie jest semantyczny                                                                                                                                      | demo bez modelu pokazuje słabą trafność                                                                   | prawdziwy model embeddingów przed demo (decyzja 1)                                                                                                       |
| Indeks wektorowy po wstawieniu tysięcy fragmentów "bootstrapuje się" i `vectorSearch` rzuca błędem przez kilkanaście sekund                                           | błąd tuż po dużym imporcie                                                                                | ponowić zapytanie; opisane w `docs/rag.md`                                                                                                               |
| Bundle akcji `"use node"` (`turndown`, `unpdf`, `mammoth`) nie był sprawdzony na Convex w chmurze                                                                     | import może się nie wdrożyć                                                                               | jednorazowa weryfikacja przed demo (krok w `docs/rag.md`)                                                                                                |
| Sprawdzenie DNS i pobranie to dwa osobne zapytania DNS                                                                                                                | teoretyczny DNS rebinding                                                                                 | import robią tylko kadry; ryzyko małe                                                                                                                    |
| Rejestr AI przechowuje prompt z treścią dokumentów i pytaniem (pseudonimizowane tylko imiona pracowników)                                                             | treść dokumentu jednostki widoczna dla każdego, kto czyta rejestr                                         | rejestr tylko dla kadr                                                                                                                                   |
| Pytanie do asystenta nie jest pseudonimizowane                                                                                                                        | imię osoby niebędącej pracownikiem trafia do modelu                                                       | uwaga przy RAG-5 (Kompas ma własną odmowę wskazania poziomu oceny)                                                                                       |
| Odpowiedź z nazwą poziomu oceny blokują wspólne guardrails                                                                                                            | asystent o ocenach może odmówić cytatu z przepisu o poziomach                                             | komunikat podpowiada, jak zapytać inaczej; do przeglądu na prawdziwym korpusie                                                                           |

## Niesprawdzone

- Prawdziwy model czatu i embeddingów od końca do końca na prawdziwym korpusie (próg i jakość odpowiedzi).
- Import 17 źródeł (15 aktów ELI i 2 strony gov.pl) na prawdziwych danych: czy wszystkie dochodzą do `indexed`,
  ile trwa, czy strony gov.pl nie niosą menu i stopki.
- Które akty z list zespołu są tylko dla KPRM.
- Produkcja: `AI_EMBEDDING_MODEL`, adres i klucz serwera embeddingów w Convex env (ustawia człowiek po decyzji 1).
- `test:e2e` lokalnie (brak przeglądarki Playwright); działa tylko w CI.
