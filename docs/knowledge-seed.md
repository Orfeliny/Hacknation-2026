# Zasilanie bazy wiedzy aktami (zestaw startowy)

Skrypt `knowledge/seed:run` wczytuje do bazy ogólnopolskiej (zakres `national`) 15 aktów z ELI i 2 strony gov.pl
z `convex/knowledge/sources.ts`. Idzie tą samą drogą co import przez kadry: `registerUrl`, parsowanie,
fragmenty, embeddingi, publikacja. Nie wpisuje wierszy na sztywno i nie czyta kluczy ani plików `.env*`.

## Przed uruchomieniem

1. W deploymencie musi istnieć konto kadr (`demoPersona: "hr"`): `npx convex run employees/seed:run`.
2. Dostawca AI: `mock` działa bez sieci modelu (wektory testowe, bez sensownej trafności). Prawdziwy model
   wymaga `AI_PROVIDER=openai-compatible` i serwera embeddingów ([ai-providers.md](ai-providers.md)).
3. Deployment musi mieć dostęp do sieci (pobieranie z `eli.gov.pl` i `www.gov.pl`).

## Uruchomienie

```bash
npx convex run knowledge/seed:run
```

Komenda rejestruje brakujące źródła i kończy się od razu. Publikację robi w tle zaplanowana akcja
`knowledge/seed:publishReady`: co minutę (do 4 godzin) publikuje dokumenty, które skończyły indeksowanie.
Embeddingi na CPU to kilkadziesiąt minut dla całości.

Ponowne uruchomienie nie tworzy duplikatów: źródło w statusie `queued`, `indexing` lub `indexed` jest pomijane,
a źródło ze statusem `failed` albo `needs_fix` jest rejestrowane od nowa.

## Sprawdzenie

W dashboardzie Convex, tabela `knowledgeDocuments`: 17 wierszy, `scope: national`, `status: indexed`, ustawione
`publishedAt`. Liczbę fragmentów pokazuje `knowledge/documents:list` (pole `chunkCount`).
Dokument przetwarzany dłużej niż 6 godzin dostaje `failed` z komunikatem; usuń go (`knowledge/documents:remove`)
i uruchom skrypt ponownie.

## Produkcja

Tylko na polecenie zespołu. Skrypt publikuje dokumenty od razu, więc wymaga konta kadr z `employees/seed:run`
albo prawdziwego konta kadr, a daty w liście kontrolnej to dzień wczytania (zob. niżej).

## Uzupełnianie danych

- Tytuły aktów to adresy publikacyjne (`Dz.U. <rok> poz. <poz>`); nazwy i daty (`effectiveDate`,
  `publicationDate`) uzupełnia się w `sources.ts`. Bez nich lista kontrolna dostaje dzień wczytania.
- Materiały z `docs/materialy_md/` nie są w zestawie; wchodzą przez `knowledge/documents:register`.
- Strony gov.pl: z kodu HTML zostaje `<main>`, a bloki `nav`, `header`, `footer` i `aside` są usuwane.
