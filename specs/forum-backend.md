# Backend of the development forum (#84, package B5)

Issue: #84 · Branch: `feat/84-forum-backend` · Status: implemented on this branch

## Goal

Replace the `NOT_IMPLEMENTED` stubs of the forum with working handlers, so the "Forum rozwoju" screen of
the Azymut prototype can switch from demo data to Convex by changing one line in its hook. The shape of
every call is fixed by `convex/lib/contracts/forum.ts` (#89); this PR changes none of it.

## Scope

- In: `convex/forum/queries.ts`, `convex/forum/mutations.ts` (handlers only), `convex/forum/validation.ts`,
  `convex/forum/seed.ts` and `seedData.ts`, tests, this spec, the generated API typings.
- Out: `convex/lib/contracts/forum.ts` and `convex/forum/tables.ts` (the contract), the frontend and its
  `src/lib/backend/` hook, moderation beyond `report` (no hiding or deleting), notifications, any new
  npm dependency.
- One shared file is touched on purpose: `convex/lib/contracts/contracts.test.ts` loses the test
  "B5 query throws NOT_IMPLEMENTED", which can no longer hold. The PR ticks the shared-files box.

## Decisions

- D1: access follows the contract: every role whose demo persona resolves to an employee may read, post,
  reply and report. A caller without such a person gets a Polish `ConvexError`. This is a demo stand-in
  for login (#42), so it is not a security boundary.
- D2: errors are `ConvexError` with a Polish message string, like the other modules, so the UI can show
  them as they are.
- D3: input is validated with Zod (`FORUM_LIMITS`): trimmed title 1 to 150 characters, body 1 to 5000,
  reply 1 to 3000. The criterion id is already checked by the Convex validator.
- D4: rows carry `authorName` and `authorUnit` taken from the author's employee record; a missing author
  shows "Nieznany autor". The UI never resolves an id.
- D5: `listThreads` returns newest first (by `createdAt`) and combines `kind` and `criterionId` with AND.
  `excerpt` is the body with collapsed whitespace, cut to 200 characters with "…".
- D6: `getThread` returns the thread and its replies oldest first, or `null` for an unknown thread.
- D7: `reply` inserts the reply and increments `replyCount` in the same mutation. `report` sets `reportedAt`
  once; a second report keeps the first time and still succeeds.
- D8: the seed is an `internalMutation`, idempotent by title, with fictional threads written by the demo
  employees (run `employees/seed:run` first). It names no real person, organisation or contact data.

## Tasks

1. `validation.ts`, access helper and `queries.ts`.
2. `mutations.ts`: `createThread`, `reply`, `report`.
3. Seed data and `seed.ts`.
4. Tests (`convex-test`): list, filters, excerpt, detail, create, reply, report, access, validation, seed.
5. Regenerate `convex/_generated`; reviewer subagent; `npm run verify`; PR.

## Acceptance criteria

- [ ] Tests for the list, the detail, adding a thread and adding a reply (`convex-test`).
- [ ] No personal data apart from the fictional demo employees (seed test).
- [ ] The response shape equals the contract; `npm run verify` is green.
