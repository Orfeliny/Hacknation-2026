# Advice view (#100)

Issue: #100 · Branch: `feat/100-advice-view` · Status: IN PROGRESS

## Goal

A `/porady` screen for supervisors on top of the merged advice backend (#58, `listAdvice`, `getAdvice`,
contract `convex/lib/contracts/advice.ts`). New files under `src/features/advice/**` only.

## Decisions

- D1. The article is addressed by `?porada=<slug>`; an unknown slug (`null`) shows a message and a link
  back to the list, a throwing query shows the same message instead of crashing.
- D2. The list filters by topic (`ADVICE_TOPICS`, labels `ADVICE_TOPIC_LABELS`) and by text (`search`,
  at most `ADVICE_LIMITS.search` characters, so the field has that `maxLength`).
- D3. The source line shows `sourceRef`, or "Dane demonstracyjne" when `isDemo`.
- D4. Sections render as `h2`, paragraphs and a bullet list from plain strings. No
  `dangerouslySetInnerHTML`, no Markdown library, no new dependency.
- D5. One `h1` per page; fields have labels; the page works without a network (offline note).
- D7. The list asks for `audience: "przelozony"` (added in #103), so employee articles do not show here.
- D6. Data comes from `api.growth.advice.*` directly: there is no `src/lib/backend/` hook in the repo yet.

## Acceptance criteria

- [ ] The topic filter and the text search narrow the list.
- [ ] The advice view renders all `sections`; a test confirms there is no `dangerouslySetInnerHTML`.
- [ ] Each article shows its source or the demo label.
- [ ] An empty list and an unknown slug show a message, not an error.
- [ ] The nav entry comes from `feature.tsx`, `router.tsx` is untouched.
- [ ] No new dependency; `npm run verify` is green.
