# Widok pracownika „Moja ocena” (#30)

## Zakres

Rola demo „oceniany” (`employee`) widzi własną ocenę okresową: status, najbliższe terminy,
ustalenia z rozmowy rozpoczynającej, podgląd IPRZ, podpis i prywatne notatki.

Poza zakresem: wnoszenie sprzeciwu (#36), logika podpisu (jest w `reviews.sign`, #12), wersja mobilna.

## Dane, które wolno zwrócić

Zapytania zwracają wyłącznie pola z listy. Wszystko inne jest niedostępne:

- obserwacje przełożonego (`observations`), plany i wnioski z rozmów (`conversations`),
- sygnały i dane HR partnera (`hrSignals`), wewnętrzne uwagi (`remarks` podpisów),
- sytuacje kadrowe (`staffingSituations`), zmiany terminów (`deadlineChanges`).

Pola oceny (`ratings`, `overallResult`, `overallLevelId`, `overallJustification`) pracownik widzi
dopiero od etapu `signing`, czyli gdy ma je podpisać.

## Kontrakt backendu (`convex/me/`)

- `queries.myReviews({ actor })`: oceny, których `employeeId` to bieżący pracownik. Tylko rola `employee`.
- `queries.myReview({ actor, reviewId })`: jedna ocena. Cudza ocena rzuca `ConvexError`.
- `queries.myNotes({ actor })`: notatki bieżącego pracownika, od najnowszej.
- `mutations.addNote({ actor, text, reviewId? })`: notatka z trymowaniem i limitem 1–1000 znaków.

`reviews.sign` (#12) jest jedynym miejscem podpisu. Widok wywołuje tę mutację bez własnej logiki.

## Kryteria akceptacji (z issue)

- [ ] Rola „oceniany” widzi wyłącznie swoje dane; odczyt cudzej oceny rzuca błąd (test).
- [ ] Odpowiedź nie zawiera obserwacji, rozmów ani sygnałów HR partnera (test sprawdza klucze).
- [ ] Podpis woła `reviews.sign` (brak drugiej implementacji).
- [ ] Układ działa od 1024 px; poniżej widoczny jest komunikat „Otwórz na komputerze”.
- [ ] `npm run verify` zielony.

## Pliki

- `convex/me/queries.ts`, `convex/me/mutations.ts`, `convex/me/me.test.ts`
- `src/features/me/feature.tsx`, `src/features/me/MePage.tsx`, `src/features/me/me.test.tsx`
- `convex/_generated/` (regeneracja po nowych plikach)
