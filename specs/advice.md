# Advice articles for supervisors (#58)

Issue: #58 · Branch: `feat/58-advice` · Status: implemented on this branch

## Goal

A supervisor who assesses for the first time needs short, practical advice, not a manual: how to give
feedback, how to run the evaluation conversation, how to look after a team, how to recognise good work,
how to work with the assessment criteria. The 2026-11-21 interviews ask for such a place. The articles
are short (about 3 minutes) and every claim rests on the repository's source documents.

## Scope

- In: `convex/growth/advice.ts` (queries), `adviceSeedData.ts` and `adviceSeed.ts` (starter articles),
  tests, `src/features/advice/**` (route `/porady`), this spec, the generated API typings for the new files.
- Out: `convex/growth/tables.ts` and `constants.ts` (the contract of #56), `convex/schema.ts`, the
  catalog (#57, files `options*`), editing articles (#60), a link from the review wizard (a later small
  PR), a Markdown library (content is structured `sections`), any new npm dependency.

## Decisions

- D1: the queries take no actor and are open to every role. Articles hold no personal data. Only articles
  with `published: true` are returned.
- D2: `listAdvice({ topic?, criterionId?, search? })` combines the filters with AND and returns the list
  fields without `sections`, sorted by title. `getAdvice({ slug })` returns the whole article or `null`.
  `search` looks in title and summary and ignores case and Polish diacritics (it reuses
  `matchesSearch` from `optionsSearch.ts`).
- D3: content is rendered with plain React elements (heading, paragraphs, bullets); no
  `dangerouslySetInnerHTML`.
- D4: the starter articles are `material_kprm`: each has a `sourceRef` and shows "Źródło: ..." in the UI.
  Their facts come only from `docs/materialy_md/06-materialy-dodatkowe/poradnik-oceny-okresowe.md` and
  `docs/materialy_md/01-akty-prawne/standardy-zarzadzania-zasobami-ludzkimi.md`: no invented quotes
  from regulations, statistics, trainings or links. An article without such a basis would be `demo`
  and show "Dane demonstracyjne".
- D5: the seed is an `internalMutation`, idempotent by `slug`. Five articles, one per topic of the
  contract except `inne`, each at most 400 words, about 3 minutes of reading.
- D6: the filter state lives in the page, so it survives opening an article and coming back; the open
  article is `?porada=<slug>`. Route `/porady`, menu label "Porady".

## Tasks

1. `advice.ts`: `listAdvice`, `getAdvice`; `adviceSeedData.ts`, `adviceSeed.ts`.
2. Backend tests: topic and criterion filters, search without diacritics, unpublished articles, seed rules.
3. Frontend: list with filters, article view, empty, not found and offline states; component tests.
4. Regenerate `convex/_generated`; reviewer subagent; `npm run verify`; PR.

## Acceptance criteria

- [ ] The list filters by topic; query and component tests.
- [ ] The article view renders every section (headings, paragraphs, bullets) without
      `dangerouslySetInnerHTML`; component test.
- [ ] Every article shows a source or "Dane demonstracyjne" (seed data test: none without one of the two).
- [ ] The seed has at least 5 articles covering every topic except `inne`, each at most 400 words (test).
- [ ] Search ignores case and diacritics: "docenianie" and "dobrostan" find their articles, "zarzadzanie"
      finds "zarządzanie" (test).
- [ ] No new npm dependency; `npm run verify` is green.
