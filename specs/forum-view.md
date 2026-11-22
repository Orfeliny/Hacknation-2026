# Forum view (#101)

Issue: #101 · Branch: `feat/101-forum-view` · Status: IN PROGRESS

## Goal

A `/forum` screen on top of the merged backend (#84, contract `convex/lib/contracts/forum.ts`). New files
under `src/features/forum/**` only; no shared file changes, no new dependency.

## Decisions

- D1. The thread is addressed by `?watek=<id>` (like `?wpis=` in the growth catalog); a malformed id shows
  "not found" instead of crashing.
- D2. The list shows newest first, with filters for the type and the criterion (AND). Each row shows the
  title, the excerpt, the author with the unit, the reply count and a "zgłoszony" marker.
- D3. The new thread and reply forms validate with Zod using `FORUM_LIMITS`, with a character counter.
  The server messages are shown as they come (`ConvexError` strings).
- D4. Thread text is rendered as plain text (React escaping, `whitespace-pre-wrap`), never as HTML.
- D5. Reporting twice is allowed by the backend and the button stays usable; the "zgłoszony" marker is
  read from the thread.
- D6. Without `VITE_CONVEX_URL` the page shows an offline note, like the other backend-bound views.
- D7. The axe test of #88 is not added: there is no axe harness in the repo yet.

## Acceptance criteria

- [ ] Filters for the type and the criterion narrow the list.
- [ ] Adding a thread and a reply works and refreshes the view; an empty title and a too long body are rejected.
- [ ] "Zgłoś" calls the report function; a repeated report does not break the view.
- [ ] List buttons have unique, accessible names.
- [ ] An empty state or a failed query does not crash the page.
- [ ] No new dependency; `npm run verify` is green.
