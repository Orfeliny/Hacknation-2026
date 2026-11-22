# Content management of the development catalog and advice articles (#60)

Issue: #60 · Branch: `feat/60-growth-admin` (based on `feat/58-advice-backend`, PR #98) · Status: in progress

## Goal

HR (kadry) can add, edit and switch off development catalog entries and add, edit and publish advice
articles, without a programmer. A stretch item: without it the demo runs on the starter data.

## Scope

- In: `convex/growth/admin.ts` and `adminValidation.ts` (+ tests), the HR panel in
  `src/features/growth/admin/` (+ component tests), this spec.
- Out: `convex/growth/tables.ts` and every other shared file (no `updatedBy`/`updatedAt`: the audit log
  records who changed what), the public `listAdvice`/`getAdvice` contract, real authentication (#42),
  any new npm dependency, deleting entries (they are only switched off or unpublished).

## Decisions

- D1: every function takes `actor: demoActor` and calls `requireHr`; any other role gets a Polish
  `ConvexError`. The demo role is not real security (#42); the check keeps the roles honest.
- D2: entries created here get `source: "urzad"`. An edit keeps the stored `source` and `sourceRef`.
- D3: catalog: `saveOption` (create without `optionId`, update with it) and `setOptionActive`. A switched-off
  entry leaves `listOptions` and `suggestForArea` (they already filter on `active`) but stays stored.
- D4: advice: `saveArticle` (create without `articleId`, update with it) and `setArticlePublished`. The slug
  is made from the title on create (diacritics folded, unique with a numeric suffix) and never changes after.
- D5: Zod validation: non-empty trimmed title, description or summary, at least one criterion for a catalog
  entry (ids come from the 2016 pack through the Convex validator), `url` only `https://`, length limits,
  at most 20 sections, each with a heading and at least one paragraph or bullet.
- D6: admin reads: `listOptionsAdmin` (also inactive) and `listArticlesAdmin` (also unpublished, with sections,
  so HR can preview before publishing). HR only.
- D7: every write is recorded in `auditLog` (entity `developmentOption` / `adviceArticle`, ids only, no text).
- D8: the panel is reached from the growth page for the HR role (`?zarzadzanie=1`), so no new route.

## Tasks

1. `adminValidation.ts`, `admin.ts`, tests (`convex-test`).
2. Regenerate `convex/_generated`.
3. HR panel and component tests.
4. Reviewer subagent; `npm run verify`; PR (after #98 merges, rebase).

## Acceptance criteria

- [ ] Content mutations and admin reads reject supervisor, employee, director and admin (tests).
- [ ] A switched-off entry disappears from `listOptions` and `suggestForArea` and stays stored (test).
- [ ] Validation rejects an empty title, an unknown criterion and a non-`https://` address with a clear
      message (backend test and component test).
- [ ] A published article shows in `listAdvice`; an unpublished one only in `listArticlesAdmin` (test).
- [ ] Every write leaves an audit entry (test).
- [ ] No new npm dependency; `npm run verify` is green.
