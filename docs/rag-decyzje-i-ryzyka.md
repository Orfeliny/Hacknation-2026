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
| RAG-6 strojenie progu na prawdziwym korpusie (#121)    | pierwszy pomiar zrobiony (skrypt i 40 pytań w branchu `feat/121-rag-eval`); trafność słaba, czeka na poprawkę chunkera                                     |
| RAG-7 serwer embeddingów i dokumentacja (#122)         | dokumentacja scalona (#143), host Modal w `infra/` (#158); bundle w chmurze i weryfikacja produkcji nie                                                    |

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

Rozstrzygnięte (2026-11-22, #122, #158, #176):

- ~~**Gdzie hostujemy `bge-m3` na produkcji**~~: ten sam host co czat, na Modal.com (`infra/`, #96). Decyzja Igora w #122.
- ~~**Wspólny `AI_BASE_URL` i klucz dla czatu i embeddingów**~~: zostaje. Router w `infra/llm_router.py` obsługuje
  `/v1/embeddings` (do `bge-m3`) i czat pod jednym adresem, więc adaptera nie zmieniamy.
- ~~**Produkcja po cichu na `mock`**~~: przyczyną było wyliczanie `process.env` w Convex; #176 czyta zmienne `AI_*`
  po nazwie.

Nadal otwarte:

1. **Weryfikacja od końca do końca na produkcji** (nie zrobiona przez agenta: brak dostępu do env produkcji):
   `infra/smoke_llm.py` na wdrożonym adresie, import jednego dokumentu (status `indexed`, `embeddingModel` `bge-m3`),
   jedno pytanie do asystenta; wdrożenie Modal na prawdziwym GPU nie było sprawdzone (`infra/README.md`).
2. **Serwis Ollama z `bge-m3` w `docker-compose.yml`** (automatyczne pobranie modelu): plik wspólny, osobny PR po
   zgodzie zespołu. Dziś to ręczny krok z `docs/rag.md`.
3. **Wykrywanie zmiany modelu embeddingów** i ponowne przeliczenie: nie zrobione, do ustalenia przy RAG-6 albo później.
4. **Czy #15 (szkic oceny) wraca do otwartych:** PR #85 zamknął je przez `Closes #15`, choć miało zostać otwarte ze
   względu na RAG (powiązanie pokrywa RAG-5, #116).

## Ryzyka

| Ryzyko                                                                                                                                                             | Skutek                                                                                                    | Co robić                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indeksowanie na CPU: paczka 64 fragmentów trwa ok. 44 s, domyślny `AI_TIMEOUT_MS` to 20 s                                                                          | import kończy się `timeout`                                                                               | `AI_TIMEOUT_MS=120000` (maksimum) albo GPU; sprawdzić, jak poszedł import w RAG-4                                                                                                                                                                       |
| `chunkCount` w `list` czyta wszystkie fragmenty z wektorami (8 KB każdy)                                                                                           | `list` przekroczy limit odczytu Convex (ok. 16 MiB) przy 17 aktach                                        | opcjonalne pole `chunkCount` na dokumencie, ustawiane przy `markIndexed` (mały PR kontraktowy); poprosiłem Kamila w #113                                                                                                                                |
| Dokument zawisa w `indexing`, gdy akcja padnie w trakcie                                                                                                           | nic go nie ponowi                                                                                         | przejście do `failed` po czasie albo ponowienie przez kadry; poprosiłem Kamila w #113                                                                                                                                                                   |
| Nieaktywne fragmenty (stare wersje, niepublikowane) zalewają kandydatów wyszukiwania                                                                               | fałszywe "Nie znalazłem tego w bazie wiedzy" przy dużej liczbie starych wersji                            | pole łączące `scope` i `active` w indeksie (zmiana pliku wspólnego); na razie 128 kandydatów na zakres                                                                                                                                                  |
| Próg trafności 0,55 ustalony na 16 pytaniach i jednym autorze; na prawdziwym korpusie poprawne trafienia mają 0,3–0,5, więc 0,55 nie przepuszcza żadnej odpowiedzi | za dużo albo za mało odpowiedzi na prawdziwym korpusie                                                    | strojenie w RAG-6 (#121) na zestawie ok. 40 pytań                                                                                                                                                                                                       |
| Trafność na prawdziwym korpusie jest słaba (akt w top-1 38%, w top-3 59%, 29 pytań ze źródłem, lokalny `bge-m3`)                                                   | asystent odpowiada „nie wiem” albo myli akty                                                              | poprawić chunker (RAG-2): `§` jako ustęp gubi numer artykułu (Kodeks pracy), strony gov.pl cięte na ok. 13 podobnych kawałków, szum w ścieżce prefiksu; potem zaindeksować od nowa i ponowić `node scripts/knowledge-eval.mjs`; prośba do Kamila w #113 |
| Limit zapisu 4 MiB/s lokalnego backendu (`Too many writes per second` w `ingest:insertChunks` i `indexing:setActive`)                                              | równoległy import kilku dokumentów wywraca najcięższy z nich (ustawa o służbie cywilnej dostała `failed`) | mniejsze paczki zapisu albo ponawianie po tym błędzie; import dokumentów po kolei; sprawdzić limity na chmurowym Convex                                                                                                                                 |
| Tryb `mock` nie jest semantyczny                                                                                                                                   | demo bez modelu pokazuje słabą trafność                                                                   | prawdziwy model embeddingów przed demo (host Modal, `infra/`)                                                                                                                                                                                           |
| Indeks wektorowy po wstawieniu tysięcy fragmentów "bootstrapuje się" i `vectorSearch` rzuca błędem przez kilkanaście sekund                                        | błąd tuż po dużym imporcie                                                                                | ponowić zapytanie; opisane w `docs/rag.md`                                                                                                                                                                                                              |
| Bundle akcji `"use node"` (`turndown`, `unpdf`, `mammoth`) nie był sprawdzony na Convex w chmurze                                                                  | import może się nie wdrożyć                                                                               | jednorazowa weryfikacja przed demo (krok w `docs/rag.md`)                                                                                                                                                                                               |
| Sprawdzenie DNS i pobranie to dwa osobne zapytania DNS                                                                                                             | teoretyczny DNS rebinding                                                                                 | import robią tylko kadry; ryzyko małe                                                                                                                                                                                                                   |
| Rejestr AI przechowuje prompt z treścią dokumentów i pytaniem (pseudonimizowane tylko imiona pracowników)                                                          | treść dokumentu jednostki widoczna dla każdego, kto czyta rejestr                                         | rejestr tylko dla kadr                                                                                                                                                                                                                                  |
| Pytanie do asystenta nie jest pseudonimizowane                                                                                                                     | imię osoby niebędącej pracownikiem trafia do modelu                                                       | uwaga przy RAG-5 (Kompas ma własną odmowę wskazania poziomu oceny)                                                                                                                                                                                      |
| Odpowiedź z nazwą poziomu oceny blokują wspólne guardrails                                                                                                         | asystent o ocenach może odmówić cytatu z przepisu o poziomach                                             | komunikat podpowiada, jak zapytać inaczej; do przeglądu na prawdziwym korpusie                                                                                                                                                                          |

## Niesprawdzone

- Prawdziwy model czatu i embeddingów od końca do końca na prawdziwym korpusie (próg i jakość odpowiedzi).
- Import 17 źródeł (15 aktów ELI i 2 strony gov.pl) na prawdziwych danych: czy wszystkie dochodzą do `indexed`,
  ile trwa, czy strony gov.pl nie niosą menu i stopki.
- Które akty z list zespołu są tylko dla KPRM.
- Produkcja od końca do końca: embed i wyszukiwanie na wdrożonym Modal i Convex env produkcji (nazw zmiennych nie sprawdzono; punkt 1 w „Do decyzji człowieka”).
- `test:e2e` lokalnie (brak przeglądarki Playwright); działa tylko w CI.
