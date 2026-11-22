# Forum moderation view (#126)

Backend: `convex/forum/moderation.ts` (#104). Hooks and `hidden` flag: PR #169. Contract:
`convex/lib/contracts/forum.ts`.

## Scope

A `/forum/moderacja` page for the "hr" role. The route lives in `src/features/forum-moderation/` because the
router reads `src/features/*/feature.tsx` only, so a nested `forum/moderation/` would not register.

- Lists reported and hidden threads, the oldest report (or hiding) first, with the kind, the author and unit,
  the reply count, the report date and the hiding date.
- Actions "Ukryj", "Przywróć" and "Odrzuć zgłoszenie", each with a thread-specific accessible name, and a
  link to the thread in the forum. A failed action shows the server message and keeps the row.
- `getThread` returns `hidden: true` for a hidden thread read by hr; the forum detail marks it
  "ukryty przed pozostałymi rolami".
- Other roles see a note instead of the list (the demo role is not a safeguard, see #42).

Decision: the page shows the hiding date from `hiddenAt` and does not use `moderatedAt` or `moderatedById`,
which mean "the last moderation action", not "when it was hidden".

## Acceptance criteria (from #126)

- [x] The view lists reported and hidden threads with unambiguous accessible actions (component test).
- [x] `forumThreadDetail` carries `hidden` (PR #169) and the backend sets it (test).
- [x] `moderatedAt` and `moderatedById` are not used; the page reads `hiddenAt` (above).
- [x] Offline mode works; `npm run verify` is green.

## Not done

- The queue has no filter or paging; it holds only reported and hidden threads.
- The live hooks run against a real backend only in the PR preview, not in an automated test.
