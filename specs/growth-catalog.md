# Catalog of development options (#57)

Issue: #57 · Branch: `feat/57-growth-catalog` · Status: implemented on this branch

## Goal

A supervisor who names an area to develop in a review (for example "komunikacja") can look up what to
offer the employee: a filterable catalog of development options. It is the base that the IPRZ and HR
partner suggestions (#59) and the HR editor (#60) build on. KPRM challenge 3.1 asks for suggested
trainings and forms of support; the 2026-11-21 interviews say there is no central base of such forms.

## Scope

- In: `convex/growth/options.ts` (queries), `optionsSearch.ts` (text matching), `optionsSeedData.ts`
  and `seed.ts` (starter entries), tests, `src/features/growth/**` (route `/rozwoj`), this spec, the
  generated API typings for the new files.
- Out: `convex/growth/tables.ts` and `constants.ts` (the contract of #56), `convex/schema.ts`, advice
  articles (#58, files `advice*`), editing entries (#60), the AI integration (#59), the router, the
  layout, any new npm dependency.

## Decisions

- D1: the queries take no actor and are open to every role. Entries hold no personal data. Only entries
  with `active: true` are returned; `getOption` returns `null` for a missing or inactive entry.
- D2: `listOptions({ criterionId?, form?, level?, cost?, search? })` combines the filters with AND. The
  criterion filter matches entries whose `criterionIds` contain the id. `search` ignores case and Polish
  diacritics and looks in title and description. Results are sorted by title (Polish collation).
- D3: both queries carry a type comment that names them as the interface for #59.
- D4: the seed is an `internalMutation` and idempotent: an entry whose title already exists is skipped.
  The seed data is a plain module so tests check it without a database.
- D5: starter entries are of two kinds. `demo`: generic forms with no `provider`, no `url`, no price
  and no named training. `material_kprm`: forms the human resources standards of the Head of the Civil
  Service (`docs/materialy_md/01-akty-prawne/standardy-zarzadzania-zasobami-ludzkimi.md`, the
  recommended forms of development activity) name; each has a `sourceRef`. Nothing is invented: no
  providers, links, prices or training names.
- D6: the page shows `GROWTH_SOURCE_LABELS` on every entry; `demo` entries show "Dane demonstracyjne".
  The filter state lives in the page; the detail view uses `?wpis=<id>` so it can be linked.
- D7: route `/rozwoj`, menu label "Rozwój". No new dependency.

## Tasks

1. `optionsSearch.ts`: `normalizeText`, `matchesSearch` (pure, tested).
2. `options.ts`: `listOptions`, `getOption`; `optionsSeedData.ts` and `seed.ts`.
3. Backend tests: three or more filter combinations, inactive entries, search, seed data rules, idempotency.
4. Frontend: catalog page with filters, list, detail, empty and offline states; component tests.
5. Regenerate `convex/_generated`; reviewer subagent; `npm run verify`; PR.

## Acceptance criteria

- [ ] The criterion filter returns only entries with that id in `criterionIds`; at least 3 filter
      combinations are tested (`convex-test`).
- [ ] `demo` entries show "Dane demonstracyjne" in the UI (component test).
- [ ] `demo` seed entries have no `url` and no `provider`; the others have a `sourceRef` (seed data test).
- [ ] The page works on an empty catalog (message, no error) and on a full one; the filter fields have
      labels and work from the keyboard.
- [ ] `listOptions` and `getOption` are documented as the interface for #59.
- [ ] No new npm dependency; `npm run verify` is green.
