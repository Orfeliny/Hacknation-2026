# Spike #31: Maelstrom jako adaptacyjny układ interfejsu

Data: 2026-11-21 · Gałąź: `spike/31-maelstrom` (nie do scalenia z `main`) · Wersja: `@maelstrom-co/react` 0.2.1

## Decyzja: NO-GO

Maelstrom działa technicznie (React 19, Convex `useQuery` w komponentach, dostępność bez zastrzeżeń), ale
dla tego projektu daje mniej, niż kosztuje. Tryb rozmowy oceniającej robimy deterministycznie: rola
i przycisk „tryb rozmowy” przełączają układ, bez AI i bez nowej zależności. Maelstrom wraca do rozważenia
po hackathonie, jeśli pojawi się potrzeba układu wybieranego przez model.

## Co zbudowano

- `spike/maelstrom/engine-server.mjs`: Engine Maelstroma w zwykłym Node (bez Bun), z deterministycznym
  plannerem (reguły zamiast modelu) i endpointem `POST /api/process` na `127.0.0.1:3101`.
- `src/features/spike-maelstrom/`: strona `/spike-maelstrom` z dwoma Vessels i polem polecenia.
  - „Skrypt rozmowy”: warianty `compact` i `full`.
  - „Wykres obserwacji”: warianty `bars` i `collapsed`; słupki liczą wpisy katalogu rozwoju z Convex
    (`api.growth.options.listOptions`), czyli prawdziwy hook `useQuery` w komponencie Vessel.
- Polecenie „Zaczynam rozmowę oceniającą” daje oczekiwany układ: skrypt na pierwszym planie,
  wykres zwinięty do jednej linii (`screenshot-start.jpg`, `screenshot-talk-mode.jpg`).

Uruchomienie: `node spike/maelstrom/engine-server.mjs`, potem `npm run dev:frontend` i `/spike-maelstrom`.

## Pomiary

| Pomiar                                   | Wynik                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Bundle bazowy (`main`)                   | JS 585,5 + 454,1 + 42,0 kB; gzip 173,3 + 152,3 + 12,9 kB (razem 338,5 kB)  |
| Dodatkowy chunk Maelstroma (lazy)        | 424,9 kB, gzip 122,5 kB (+36% gzip, ładowany tylko na tej stronie)         |
| Zmiana głównego bundla                   | +0,35 kB (sam wpis trasy)                                                  |
| Czas decyzji Engine (planner bez modelu) | 3,8 do 11,1 ms                                                             |
| Kliknięcie do zmiany układu (z renderem) | 116 ms (przeglądarka Chromium, lokalnie)                                   |
| React 19.3.1                             | działa, brak ostrzeżeń i błędów w konsoli                                  |
| Convex `useQuery` w Vessel               | działa, wykres pokazuje 12 wpisów z lokalnego backendu                     |
| axe-core (WCAG 2.1 AA), oba układy       | 0 naruszeń                                                                 |
| Szerokości 1280, 600 i 375 px            | bez przewijania poziomego strony, wykres dopasowuje szerokość              |
| Praca offline                            | ścieżka deterministyczna nie ma wywołań zewnętrznych (tylko pętla zwrotna) |

Czasu odpowiedzi modelu, jakości układów wybieranych przez model i pracy z modelem lokalnym nie zmierzono:
na tej maszynie nie ma Ollamy ani Bielika, a klucz OpenAI nie jest dostępny.

## Raport zależności (oss-first)

```
Dependency: @maelstrom-co/react@0.2.1, @maelstrom-co/protocol@0.2.1 (dependencies); @maelstrom-co/engine@0.2.1 (dev)
Checked: registry+repo match PASS | license PASS (MIT, wszystkie nowe pakiety) | activity PASS (push 2026-11-20, wydanie 0.2.1 z 2026-11-03)
         | vulns PASS (npm audit: 0 nowych; 7 umiarkowanych jest tak samo na main i dotyczy eslint/minimatch, dev)
         | scorecard NIE DOSTĘPNY (API OpenSSF zwraca 404: repo nie ma wyniku w publicznym zbiorze)
Nowe pakiety w lockfile (10): @maelstrom-co/{react,client,connectors,protocol,engine,telemetry}, @tanstack/{react-store,store},
         use-sync-external-store, nanoid (zagnieżdżony w protocol). Skrypty instalacyjne: brak nowych.
Ryzyka: repo od 2026-05 (6 miesięcy), 16 gwiazdek, wersja 0.x bez gwarancji API.
```

`npm audit --omit=dev`: 0 podatności przed i po dodaniu pakietów.

## Dlaczego NO-GO

1. **Wartość wymaga modelu, a model łamie nasze reguły.** Układ „wybiera model”; planner LLM
   (`@maelstrom-co/planner-llm` + `@tanstack/ai-openai`) wysyła polecenie, historię i strukturę ekranu do
   dostawcy. To drugi punkt integracji z AI poza `convex/ai`, więc omija pseudonimizację (#28), rejestr użycia AI
   (#39) i regułę, że dostawcę wybiera wyłącznie env Convex. Obejście wymagałoby własnego plannera
   wołającego naszą warstwę AI; to możliwe (planner to funkcja), ale nieprzetestowane i dodaje pracę.
2. **Darmowe AI i on-prem.** Kompas wymaga darmowego AI, a KPRM pracy lokalnej. Konfiguracja `baseURL` dla
   adaptera OpenAI sugeruje punkt końcowy zgodny z OpenAI, ale zgodności z lokalnym modelem polskim nie
   sprawdzono (patrz „nie zmierzono”).
3. **Dodatkowy proces.** Engine to osobny serwer (starter używa Bun; tu uruchomiony w Node), z historią
   w pamięci procesu i znanymi zastrzeżeniami współbieżności. Dla wdrożenia on-prem to kolejny kontener.
4. **Dojrzałość.** Repozytorium ma pół roku, 16 gwiazdek i wersję 0.x. Scorecard niedostępny.
5. **Potrzeba jest prosta.** Użyty tu planner to w praktyce dwie reguły. Ten sam efekt, czyli przełączenie
   układu skrypt/wykres, daje stan komponentu i przycisk, bez zależności.

Niezależnie od wyniku tryb rozmowy musi działać bez Maelstroma i bez modelu (fallback w #14).

## Czego nie zmierzono

- Czas i jakość odpowiedzi modelu (brak modelu lokalnego i klucza).
- Zgodność adaptera z lokalnym modelem (Bielik/PLLuM) przez `baseURL`.
- Praca z odciętą siecią (sprawdzono tylko, że ścieżka deterministyczna nie ma połączeń zewnętrznych).
- Engine uruchomiony wewnątrz akcji Convex (środowisko Node) jako zamiennik osobnego serwera.
- OpenSSF Scorecard (API zwróciło 404).

## Tekst komentarza do #31 (do wklejenia po akceptacji)

> **Decyzja: NO-GO** (spike na gałęzi `spike/31-maelstrom`, bez zmian w `main`).
>
> Maelstrom 0.2.1 działa z React 19 i z hookiem Convex `useQuery` w komponencie Vessel, bez uwag dostępności
> (axe: 0 naruszeń). Dwa Vessels („skrypt rozmowy”, „wykres obserwacji”) układają się zgodnie z poleceniem
> „Zaczynam rozmowę oceniającą”.
>
> Pomiary: dodatkowy chunk 424,9 kB (gzip 122,5 kB, +36% względem bundla bazowego 338,5 kB gzip, ładowany
> leniwie); decyzja Engine 4 do 11 ms z plannerem bez modelu; od kliknięcia do zmiany układu 116 ms.
>
> Dlaczego NO-GO: wartość wymaga plannera z modelem, który wysyła dane poza `convex/ai` (omija
> pseudonimizację #28, rejestr AI #39 i regułę „dostawca tylko z env Convex”); wymaga osobnego procesu Engine;
> projekt ma 6 miesięcy, 16 gwiazdek i wersję 0.x; Scorecard niedostępny. Tryb rozmowy robimy
> deterministycznie (rola i przycisk), bez AI.
>
> Raport zależności: licencje MIT, `npm audit` bez nowych podatności (0 w produkcji), 10 nowych pakietów.
> Nie zmierzono modelu lokalnego (brak na maszynie) ani pracy z odciętą siecią.
