# Backend of the advice articles (#58, package B1)

Issue: #58 · Branch: `feat/58-advice-backend` · Status: implemented on this branch

## Goal

Replace the `NOT_IMPLEMENTED` stubs of `listAdvice` and `getAdvice` with working handlers, so the advice
screen of the Azymut prototype can switch from demo data to Convex by changing one line in its hook. The
shape of both calls is fixed by `convex/lib/contracts/advice.ts` (#89); this PR changes none of it.

## Scope

- In: `convex/growth/advice.ts` (handlers only), `adviceSeedData.ts` and `adviceSeed.ts` (starter
  articles), tests, this spec, the generated API typings.
- Out: the contract and `convex/growth/tables.ts`, the frontend and its `src/lib/backend/` hook, editing
  articles (#60), a link from the review wizard, any new npm dependency.
- The shared test `convex/lib/contracts/contracts.test.ts` loses "B1 query throws NOT_IMPLEMENTED" in its own
  contract PR (#95), as the hot-files rule asks; this PR touches no shared file.

## Decisions

- D1: both queries are public: no actor, every role and anonymous callers. Only articles with
  `published: true` are returned.
- D2: `listAdvice({ topic?, search? })` returns the list fields only (`slug`, `title`, `summary`, `topic`,
  `readingMinutes`, `sourceRef`, `isDemo`), no `sections`, sorted by title. `topic` and `search` combine
  with AND. `search` looks in title and summary and ignores case and Polish diacritics (it reuses
  `matchesSearch` from `optionsSearch.ts`). A phrase over `ADVICE_LIMITS.search` is a Polish `ConvexError`.
- D3: `isDemo` is `source === "demo"`. The contract has no `source` or `criterionId`, so neither is returned.
- D4: `getAdvice({ slug })` returns the list fields plus `sections`, or `null` for an unknown, unpublished or
  over-long slug.
- D5: the starter articles are the five of the old branch `feat/58-advice`, one per topic of the contract
  except `inne`. Each is `material_kprm` with a `sourceRef`; its facts come only from
  `docs/materialy_md/06-materialy-dodatkowe/poradnik-oceny-okresowe.md` and
  `docs/materialy_md/01-akty-prawne/standardy-zarzadzania-zasobami-ludzkimi.md`. Each has at most 400 words.
- D6: the seed is an `internalMutation`, idempotent by `slug`.

## Tasks

1. `advice.ts` handlers; `adviceSeedData.ts` and `adviceSeed.ts`.
2. Tests (`convex-test`): shape, filters, search, unpublished, limits, `getAdvice`, seed and seed data.
3. Regenerate `convex/_generated`; reviewer subagent; `npm run verify`; PR (after #95).

## Acceptance criteria

- [ ] `listAdvice` filters by topic and searches ignoring case and diacritics (tests).
- [ ] Both handlers return exactly the contract's shape; `getAdvice` returns every section.
- [ ] Unpublished articles are never returned.
- [ ] The seed has 5 articles covering every topic except `inne`, each at most 400 words, each with a source
      or the demonstration mark.
- [ ] No new npm dependency; `npm run verify` is green once #95 is merged.
