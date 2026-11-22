# Development blog landing page (#102)

Issue: #102 · Branch: `feat/102-development-blog` · Status: IN PROGRESS

## Goal

One "Development" place for the employee: `/blog-rozwoju` with entry tiles to the catalog (`/rozwoj`),
the advice (`/porady`) and the forum (`/forum`), a "Najnowsze" section, and development suggestions for
the employee's own areas. New files under `src/features/blog/**` only. `GrowthPage` is untouched; the
link in "Moja ocena" (`src/features/me/**`) is a separate PR agreed with that view's author.

## Decisions

- D1. The tiles use the existing queries: `listOptions`, `listAdvice` (for `audience: "pracownik"`, #103)
  and `listThreads`; each shows an item count.
- D2. "Najnowsze" shows the 3 newest forum threads (the query is newest first). The advice list has no
  date, so its 3 entries are the first by title and the section calls them "Porady do przeczytania",
  not "newest".
- D3. "Dla Twoich obszarów rozwoju" reads the criteria from the employee's latest review whose assessment
  is visible to them (`api.me.queries.list` and `get`, `developmentPlan.areas[].criterionId`) and passes
  them to `DevelopmentSuggestions` (#59), so only catalog entries appear, each with its match reason.
- D4. The `me` queries throw for a non-employee, so they are skipped for the other roles; those see a
  note and a link to the full catalog. Without a visible review, or without areas, the employee sees the
  same note. Nothing is invented.
- D5. Advice entries show "Dane demonstracyjne" when `isDemo`; catalog entries get it from
  `DevelopmentSuggestions`.
- D6. One `h1`, unique link names, a failing query does not crash the page; offline shows a note.

## Acceptance criteria

- [ ] The three entry points and "Najnowsze" are shown, with full and with empty data.
- [ ] The areas section uses only catalog entries, shows a message when there are none, and each
      suggestion shows its reason.
- [ ] Demo entries are marked "dane demonstracyjne".
- [ ] The page works for every demo role and shows no personal data beyond the employee's own areas.
- [ ] One `h1`, clear link names; no new dependency; `npm run verify` is green.
