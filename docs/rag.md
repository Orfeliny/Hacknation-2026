# Baza wiedzy (RAG): wdrożenie

Jak uruchomić serwer embeddingów `bge-m3` i skonfigurować bazę wiedzy asystenta lokalnie, on-premise i na produkcji. Projekt i decyzje: [specs/knowledge-rag.md](../specs/knowledge-rag.md). Zmienne i błędy dostawców AI: [ai-providers.md](ai-providers.md). Zadanie: [#122](https://github.com/Orfeliny/Hacknation-2026/issues/122) (część [#86](https://github.com/Orfeliny/Hacknation-2026/issues/86)).

## Co jest potrzebne

Baza wiedzy zamienia fragmenty dokumentów na wektory (embeddingi) i wyszukuje po nich. Do tego potrzebny jest serwer zgodny z OpenAI `POST /v1/embeddings`, który obsługuje model `bge-m3` (1024 wymiary). Bez niego działa tylko dostawca `mock`: wektory ze skrótu słów, bez sensownej trafności, za to offline. `mock` zostaje domyślny i jest siatką bezpieczeństwa demo.

Ważne zastrzeżenia:

- **Czat i embeddingi używają tego samego `AI_BASE_URL` i klucza.** Osobnego adresu dla embeddingów nie ma. Serwer pod tym adresem musi więc obsługiwać oba endpointy: `/chat/completions` (model z `AI_MODEL`) i `/embeddings` (model z `AI_EMBEDDING_MODEL`). Jeden Ollama z dwoma modelami to spełnia. Osobny host tylko do embeddingów wymagałby zmiany kodu adaptera (osobny PR, plik wspólny).
- **Bielik i PLLuM z [#96](https://github.com/Orfeliny/Hacknation-2026/issues/96) to modele czatu, nie embeddingów.** `bge-m3` jest osobnym modelem (ok. 1,2 GB wag) i wymaga własnego `ollama pull` albo własnego procesu.
- Fragmenty dokumentów trafiają do skonfigurowanego dostawcy embeddingów bez pseudonimizacji (to akty prawne i regulaminy, nie dane osobowe; podgląd ostrzega kadry przed publikacją, patrz [specs/knowledge-rag.md](../specs/knowledge-rag.md), sekcja Privacy).

## Zmienne (tylko Convex env)

Klucze i adresy ustawia się wyłącznie w Convex env, nigdy w `VITE_*` ani `.env.local`.

| Zmienna              | Wartość dla RAG                                | Uwagi                                                                                                   |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`        | `openai-compatible`                            | `mock` zostaje domyślny.                                                                                |
| `AI_BASE_URL`        | np. `http://llm:11434/v1` albo `https://…/v1`  | Musi kończyć się na `/v1`. Reguły `http` i `AI_ALLOW_PRIVATE_HTTP`: [ai-providers.md](ai-providers.md). |
| `AI_EMBEDDING_MODEL` | `bge-m3` (domyślna)                            | Musi zwracać dokładnie 1024 wymiary.                                                                    |
| `AI_MODEL`           | model czatu                                    | Wymagany przez konfigurację `openai-compatible`, także gdy serwer służy tylko do embeddingów.           |
| `AI_API_KEY`         | klucz serwera (Ollama przyjmuje dowolny napis) | Wymagany, niepusty.                                                                                     |
| `AI_TIMEOUT_MS`      | `120000` na serwerze bez GPU                   | Domyślne 20000 ms nie wystarcza (patrz „Pomiary”). Maksimum to 120000.                                  |

## Serwer embeddingów

### Lokalnie (laptop, Docker)

Obraz Ollamy jest przypięty w `docker-compose.yml` (usługa `llm`, profil `ai`). Najprościej uruchomić go jednorazowo, z osobnym wolumenem na wagi:

```powershell
docker run -d --name ollama-rag -p 11434:11434 -v ollama-spike:/root/.ollama ollama/ollama@sha256:ccc42bcd3d5fcf7ab0d532b300382154e1a4da56fc666bdb313b78ebdd912754
docker exec ollama-rag ollama pull bge-m3
```

Adres dla adaptera: `http://127.0.0.1:11434/v1` (`localhost` i `127.0.0.1` są dozwolone po `http` bez flag). Convex działający lokalnie (`npx convex dev`) sięga do niego bezpośrednio; Convex w chmurze nie. Po pracy: `docker rm -f ollama-rag` (wolumen z wagami zostaje).

### On-premise (Docker Compose)

Profil `ai` w `docker-compose.yml` uruchamia usługę `llm` (Ollama) w sieci Compose, bez portu na zewnątrz. Wagi pobiera się do jej wolumenu:

```powershell
docker compose --env-file .env.docker.local --profile ai up -d llm
docker compose --env-file .env.docker.local exec llm ollama pull bge-m3
```

W Convex env: `AI_PROVIDER=openai-compatible`, `AI_BASE_URL=http://llm:11434/v1`, `AI_ALLOW_PRIVATE_HTTP=true`, `AI_EMBEDDING_MODEL=bge-m3`, `AI_TIMEOUT_MS=120000`. Ten sam Ollama może obsługiwać model czatu (Bielik, PLLuM): [on-premise.md](on-premise.md) i [ai-providers.md](ai-providers.md). Urząd pobiera wagi raz przez internet; paczki offline nie ma.

Propozycja (nie wdrożona): dodać do usługi `llm` w `docker-compose.yml` automatyczne pobranie `bge-m3`. To plik wspólny, więc wymaga osobnego PR-a po zgodzie zespołu (opis w komentarzu w [#122](https://github.com/Orfeliny/Hacknation-2026/issues/122)).

### Produkcja (Convex Cloud + Vercel)

Convex w chmurze nie dosięgnie Ollamy na laptopie. **Rozstrzygnięte:** produkcja używa jednego hosta na Modal.com dla czatu (PLLuM) i embeddingów (`bge-m3`), z jednym adresem `https` i jednym kluczem. Kod i wdrożenie są w `infra/` ([infra/README.md](../infra/README.md), [#96](https://github.com/Orfeliny/Hacknation-2026/issues/96), [#158](https://github.com/Orfeliny/Hacknation-2026/pull/158)): router `infra/llm_router.py` kieruje `/v1/embeddings` do procesu `bge-m3` (1024 wymiary), a resztę do modelu czatu, więc `AI_BASE_URL` i `AI_API_KEY` zostają wspólne i adaptera nie trzeba zmieniać. Zmienne produkcji i komendy `npx convex env set --prod …` są w `infra/README.md`.

Zmiany Convex env produkcji robi człowiek, nie agent. Od [#176](https://github.com/Orfeliny/Hacknation-2026/pull/176) konfiguracja czyta zmienne `AI_*` po nazwie; wcześniej wyliczanie `process.env` nic nie widziało w Convex i produkcja po cichu wracała do `mock`. Jeśli RAG na produkcji nadal wygląda jak `mock` (słaba trafność), sprawdź, czy wdrożono wersję z #176 i czy `AI_PROVIDER=openai-compatible`.

Opcje alternatywne (nieużywane, gdyby Modal odpadł): własny host z Ollamą za `https` i kluczem albo hostowane API z `bge-m3` zgodne z OpenAI (sprawdzić 1024 wymiary, limit paczki 64, politykę danych i cenę).

Weryfikacja po ustawieniu env: zasilić jeden mały dokument (patrz niżej) i sprawdzić, że ma status `indexed`, a `embeddingModel` na dokumencie to `bge-m3`.

## Zasilenie bazy

Zestaw startowy aktów (ELI, gov.pl) importuje się tym samym potokiem co dokumenty kadr: import → podgląd → indeksowanie (fragmenty i embeddingi w partiach po 64) → publikacja. Szczegóły i lista źródeł: [specs/knowledge-rag.md](../specs/knowledge-rag.md); zasilenie zestawem startowym (RAG-4, [#115](https://github.com/Orfeliny/Hacknation-2026/issues/115)) opisuje [knowledge-seed.md](knowledge-seed.md).

Indeksowanie jednej partii (do 64 fragmentów) to jedno wywołanie `/embeddings`. Na CPU trwa to kilkadziesiąt sekund, więc `AI_TIMEOUT_MS` musi być odpowiednio duży, inaczej partia kończy się błędem `timeout`, a dokument statusem błędu.

## Zmiana modelu embeddingów

Indeks wektorowy `knowledgeChunks.by_embedding` ma stałe 1024 wymiary. Konsekwencje:

- Inny model o 1024 wymiarach: wektory z różnych modeli nie są porównywalne, więc trzeba ponownie policzyć embeddingi wszystkich dokumentów. Model użyty do dokumentu zapisuje się w `knowledgeDocuments.embeddingModel`, co pozwala znaleźć dokumenty ze starym modelem.
- Model o innym wymiarze (np. 768 lub 3072): adapter odrzuca odpowiedź (`bad_response`), a zmiana wymaga przebudowy indeksu (zmiana `EMBEDDING_DIMENSIONS` i schematu, wspólny kontrakt) i ponownego policzenia wszystkiego.
- Zmiana `AI_EMBEDDING_MODEL` bez ponownego indeksowania daje zapytania w innej przestrzeni niż dokumenty, czyli złe wyniki bez błędu.

## Uprawnienia

Import, podgląd, publikacja i wycofanie dokumentów: kadry (HR) i administrator. Odpowiedzi czyta każda osoba z rolą. Odmowa to `ConvexError({ code: "denied", … })`, a import, publikacja i wycofanie trafiają do dziennika audytu ([#39](https://github.com/Orfeliny/Hacknation-2026/issues/39)).

## Rozwiązywanie problemów

| Objaw                                                                   | Przyczyna i działanie                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`: „HTTP 404: check that AI_BASE_URL … /v1”                      | `AI_BASE_URL` bez `/v1` albo model `AI_EMBEDDING_MODEL` nieistniejący na serwerze. Ollama zwraca 404 w obu przypadkach, więc komunikat wskazuje adres nawet gdy brakuje modelu: sprawdzić `ollama list`. |
| `config`: „Invalid AI configuration …”                                  | Brakuje `AI_MODEL` lub `AI_API_KEY`, adres `http` poza `localhost`/`127.0.0.1` bez `AI_ALLOW_PRIVATE_HTTP`, albo adres z hasłem. Komunikat nazywa pola, nie wartości.                                    |
| `config`: „embed does not take an empty text” lub za długi tekst        | Wywołujący przekazał pusty tekst albo ponad 8000 znaków. Wyjątek zgłaszany bez ruchu w sieci.                                                                                                            |
| `bad_response`: „must return 1024 dimensions”                           | Model ma inny wymiar niż 1024. Użyć `bge-m3` albo przebudować indeks (sekcja wyżej).                                                                                                                     |
| `bad_response`: „does not match the embeddings shape” / „indices”       | Serwer nie jest zgodny z OpenAI `/embeddings` (inna liczba wektorów niż tekstów, powtórzone `index`). Sprawdzić serwer i wersję.                                                                         |
| `timeout`                                                               | Za mały `AI_TIMEOUT_MS` względem serwera bez GPU. Ustawić `120000` albo przyspieszyć serwer.                                                                                                             |
| `unavailable` / `auth` / `rate_limited`                                 | Serwer niedostępny (kontener nie działa, zły adres), zły klucz (401/403) albo limit dostawcy. Adapter ponawia tylko błędy przejściowe, do `AI_MAX_RETRIES`.                                              |
| Wyszukiwanie zaraz po imporcie rzuca „Vector indexes are bootstrapping” | Indeks wektorowy po dużym zapisie chwilę się buduje (obserwowane: do kilkunastu sekund na 5000 fragmentów). Ponowić zapytanie.                                                                           |

Szersza lista błędów: [troubleshooting.md](troubleshooting.md).

## Pomiary (2026-11-22)

Środowisko: laptop z Windows, Docker Desktop, Ollama z obrazu przypiętego w `docker-compose.yml`, model `bge-m3`, procesor bez GPU. Pomiary dotyczą kodu adaptera `createOpenAICompatibleProvider` i serwera lokalnego; **nie** dotyczą Convex Cloud ani żadnego serwera produkcyjnego.

### Prawdziwe wywołanie `embed`

- Paczka 3 tekstów: 3 wektory po 1024 wymiary, długość wektora 1,0 (znormalizowane), zużycie 46 tokenów.
- Kolejność: wektor trzeciego tekstu z paczki jest identyczny (cosinus 1,0) z wektorem tego samego tekstu wysłanego osobno; pokrewne zdania mają cosinus 0,70, niepowiązane 0,27.
- Pusty tekst: błąd `config` bez ruchu w sieci. Adres bez `/v1` i nieistniejący model: oba dają 404 i błąd `config`.
- Paczka 64 tekstów po ok. 1200 znaków: 43,9 s (ok. 0,69 s na tekst, 18 782 tokenów). To więcej niż domyślne `AI_TIMEOUT_MS` (20 s), dlatego na CPU trzeba ustawić `AI_TIMEOUT_MS=120000` (maksimum). Pojedyncze krótkie zapytanie: ok. 50 ms przy rozgrzanym modelu.

### Skala indeksu wektorowego

Tabela z indeksem 1024 wymiarów i polami filtra `scope`, `unit`, `active`, 5003 fragmenty (losowe znormalizowane wektory, tekst 1200 znaków każdy), `ctx.vectorSearch` w akcji, 20 kolejnych zapytań na każdy wariant. Dwa backendy: lokalny open-source (`npx convex dev`, tryb anonimowy) i obraz self-hosted z `docker-compose.yml`.

| Filtr                   | Limit | Mediana (lokalny / self-hosted) | Maksimum (lokalny / self-hosted) |
| ----------------------- | ----- | ------------------------------- | -------------------------------- |
| `eq(scope, "national")` | 40    | 3 ms / 3 ms                     | 3 ms / 5 ms                      |
| `eq(scope, "national")` | 128   | 3 ms / 3 ms                     | 4 ms / 4 ms                      |
| `or(national, office)`  | 40    | 3 ms / 3 ms                     | 4 ms / 4 ms                      |
| `or(national, office)`  | 128   | 4 ms / 3 ms                     | 4 ms / 4 ms                      |
| `eq(unit, …)`           | 40    | 2 ms (lokalny)                  | 2 ms (lokalny)                   |
| `eq(unit, …)`           | 128   | 2 ms (lokalny)                  | 3 ms (lokalny)                   |

Poprawność: żaden wynik nie wyszedł poza filtr (0 błędnych wśród wszystkich zwróconych); wstawiony znany wektor (cosinus 1,0) wracał na pierwszych miejscach, a jego kopia w innym zakresie (`office`) była wykluczona filtrem `scope = national`.

Wnioski i ograniczenia:

- Filtr `eq(scope, …)` **nie wyklucza** nieaktywnych fragmentów: wstawiony nieaktywny fragment (`active = false`) wrócił na pierwszym miejscu. Kod wyszukiwania (RAG-3, [#114](https://github.com/Orfeliny/Hacknation-2026/issues/114)) musi osobno odfiltrować `active` (po odczycie dokumentów albo przez filtr, który to wyrazi), bo spec zakłada, że szukane są tylko aktywne fragmenty.
- Czasy dotyczą losowych wektorów, nie wektorów `bge-m3` (rozkład wyników może wpływać na czas, choć nie sprawdzano tego); jedna instancja, bez ruchu równoległego. Pomiar w chmurze Convex nie był wykonany.
- Zapis: partie po 200 fragmentów (wektor 1024 liczb i tekst 1200 znaków) w jednej mutacji przechodzą. Zliczenie wszystkich 5000 dokumentów jednym zapytaniem przekracza limity Convex; do zliczania trzeba użyć paginacji.

## Niezweryfikowane (do zrobienia przez zespół)

- **Bundle akcji `"use node"` na Convex Cloud** (`turndown`, `unpdf`, `mammoth`). Spike działał tylko na lokalnym backendzie. Krok weryfikacji: wdrożyć gałąź zawierającą import (`convex/knowledge/parse.ts`) do **podglądu lub projektu testowego Convex** (`npx convex deploy` z kluczem projektu testowego, nie produkcji), sprawdzić, że wdrożenie przechodzi bez błędu o rozmiarze lub wersji Node, i wywołać import małego dokumentu HTML i PDF. Wynik dopisać w [#122](https://github.com/Orfeliny/Hacknation-2026/issues/122).
- **Embeddingi na produkcji od końca do końca**: host jest wybrany (Modal, `infra/`), ale `infra/README.md` sam zaznacza, że wdrożenie na prawdziwym GPU nie było sprawdzone (podział pamięci GPU, szablon czatu). Do zrobienia: `python infra/smoke_llm.py` na wdrożonym adresie (czat i 1024 wymiary), potem import jednego małego dokumentu na produkcji (status `indexed`, `embeddingModel` = `bge-m3`) i jedno pytanie do asystenta. Zimny start trwa dłużej niż `AI_TIMEOUT_MS`, więc przed próbą rozgrzać kontener (`LLM_MIN_CONTAINERS=1`). Nazw ustawionych zmiennych w Convex env produkcji nie sprawdzono (`npx convex env list --prod`, bez wypisywania wartości).
- **Wyszukiwanie z prawdziwymi wektorami `bge-m3` na indeksie Convex** i trafność na pełnym korpusie (RAG-4 i RAG-6).
