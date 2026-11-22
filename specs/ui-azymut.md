# Azymut UI: view map, backend contract and task list

The UI contract PR (`chore/80-ui-contract`, `Closes #80`) gives every view task the same base: tokens,
primitives, data hooks and the app shell. This file is what the view tasks build on. The shell itself
is described in [docs/architecture.md](../docs/architecture.md); the prototype is in
[docs/prototyp.md](../docs/prototyp.md).

## Shell rules (feature registration)

A `src/features/<dir>/feature.tsx` default export may set, besides `path`, `navLabel`, `order`, `profiles`, `devOnly`:

- `roles?: DemoRole[]`: the nav shows the feature only for these roles. Absent means every role.
- `startFor?: DemoRole[]`: the feature is the start page ("Pulpit") of these roles. A role tab opens it and `/` redirects to it.
- `hideInNav?: boolean`: reachable by link only (sub-screens such as preview, card, assign).

`roles` filters the nav only. Routes are not guarded: every registered path opens for every role, and
access is enforced by the backend through the demo actor. Do not add route guards.

The footer shows "Deklaracja dostępności", "Zasady i paleta", "Przepisy" and "Logowanie (demo)" only
when the matching route is registered, so a new page appears there without touching `src/app/`.

Views that link to a screen another task adds use `useRouteRegistered(path)` or `<RouteLink to=...>` from
`src/app/` (import from `"../../app/index"`: on case-insensitive Windows `"../../app"` resolves to
`src/App.tsx`, TS1149; never `router.tsx`, never `UNSAFE_*` react-router APIs). The link renders only when the path is
registered; the query string is ignored and `hideInNav` paths count. Tests must not assume a home page at
`/`: once a role has a `startFor` feature, `/` redirects there. Assert shell landmarks or your own page.

## View → feature map

| #   | Screen (file)                             | Feature dir                     | Path                                                                         | Roles                   | Data                                                       | Issues        |
| --- | ----------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- | ------------- |
| 1   | Pulpit (Main)                             | `dashboard` (new)               | `/pulpit`                                                                    | supervisor (start)      | reviews, conversations, observations, myReminders          | #11           |
| 2   | Arkusz C (Review)                         | `review`                        | `/oceny`                                                                     | supervisor              | reviews                                                    | #12, #70      |
| 3   | Podgląd oceny (read-only)                 | `review`                        | `/oceny?ocena=&tryb=podglad`                                                 | supervisor, hr          | reviews.get                                                | #12           |
| 4   | AI hints + Wnioski do IPRZ (Review)       | `review`                        | `/oceny` (section)                                                           | supervisor              | hook B6                                                    | #15, #59      |
| 5   | Rozmowa                                   | `conversation` (new)            | `/rozmowy`                                                                   | supervisor              | conversations, mail                                        | #14, #37      |
| 6   | Dziennik obserwacji                       | `observations` (new)            | `/obserwacje`                                                                | supervisor              | observations                                               | #13           |
| 7   | Zmiana oceniającego (Handover)            | `handover` (new)                | `/zmiana-oceniajacego`                                                       | supervisor              | observations.handOver                                      | #13           |
| 8   | Pakiet dla następcy: author picks entries | `handover`                      | `/pakiet-nastepcy?pracownik=` (hideInNav; linked from row 7)                 | supervisor              | observations.handOver / revokeHandover                     | #13           |
| 9   | Wniosek o przesunięcie terminu            | `deadline-shift` (new)          | `/przesuniecie-terminu` (hideInNav; linked from row 1 and from its own list) | supervisor              | hook B2                                                    | #83, #10      |
| 10  | Porady                                    | `advice` (new)                  | `/porady`                                                                    | all                     | hook B1                                                    | #58           |
| 11  | Moja ocena w toku                         | `me`                            | `/moja-ocena`                                                                | employee (start)        | me, reviews                                                | #30           |
| 12  | Zapoznanie i sprzeciw                     | `objections`                    | `/wynik-oceny` (hideInNav; linked from row 11)                               | employee                | objections, signatures                                     | #36           |
| 13  | Rozstrzygnięcie sprzeciwu                 | `objections`                    | `/sprzeciwy`                                                                 | director (start)        | objections                                                 | #36           |
| 14  | Panel kadr                                | `hr-office` (new)               | `/kadry`                                                                     | hr (start)              | hrDashboard                                                | #17           |
| 15  | Przypisanie oceniającego                  | `hr-assign` (new)               | `/kadry/przypisanie` (HR menu item, as in the prototype)                     | hr                      | employees                                                  | #17           |
| 16  | Karta pracownika                          | `employee-card` (new)           | `/kadry/pracownik` (hideInNav; linked from rows 14 and 15)                   | hr                      | employees.card, hook B2 (notice sent), fixtures (absences) | #17, #83      |
| 17  | Ustawienia urzędu                         | `settings` (new)                | `/ustawienia`                                                                | hr, admin (admin start) | hook B3 + fixtures                                         | #27, #42, #26 |
| 18  | Dokumenty wewnętrzne                      | `knowledge-docs` (new)          | `/ustawienia/dokumenty`                                                      | hr, admin               | hook B4                                                    | #20, #28, #26 |
| 19  | Forum rozwoju                             | `growth`                        | `/rozwoj`                                                                    | all                     | growth.options + hook B5 + hook B6 ("Dodaj do IPRZ")       | #84, #57      |
| 20  | Logowanie                                 | `login` (new)                   | `/logowanie` (hideInNav; footer link)                                        | all                     | fixtures                                                   | #42           |
| 21  | Zasady i paleta                           | `style-guide` (new)             | `/zasady` (hideInNav)                                                        | all                     | static                                                     | #80           |
| 22  | Deklaracja dostępności                    | `accessibility-statement` (new) | `/deklaracja-dostepnosci` (hideInNav)                                        | all                     | static (`docs/zgloszenie/deklaracja-dostepnosci.md`)       | #40           |

Existing paths stay. Ids travel in the query string (`?ocena=`, `?pracownik=`, `?ocena=&zmiana=<changeIndex>`,
and for the forum opened from a review `?ocena=<reviewId>&obszar=<areaId>`), as in `print`.

## Backend contract

The function names and fields below are binding. The exact validators live in
`convex/lib/contracts/<package>.ts`. `actor` (see the hook rules) is in every function except those
marked _public_, and is left out of the signatures below.

B3 (AI status) and B6 (IPRZ, drafting, growth suggestions) are not in the contract package: B3 was merged
with #81 (`convex/aiStatus/queries.ts`, state `mock | local | external | invalid`), and B6 follows the open
PRs #85 and #87 (`drafting.actions.generate`, `drafting.mutations.setStatus` / `edit`,
`growth.rankOptions.rankOptions`, `growth.suggest.suggestForArea`). `addToIprz` exists in neither and
stays demo-only. Use the hooks in `src/lib/backend/{aiStatus,iprz}.ts`.

**B1 Advice** (`convex/lib/contracts/advice.ts`)

- query _public_ `listAdvice({ topic?, search? })` → `{ slug, title, summary, topic, readingMinutes?, sourceRef?, isDemo }[]`
- query _public_ `getAdvice({ slug })` → the same fields plus `sections`, or `null`

**B2 Deadline shift** (`convex/lib/contracts/deadlineShift.ts`)

- Row `ShiftRequest = { reviewId, changeIndex, employeeId, employeeName, employeePosition, supervisorName, currentDueDate, reason, basis: mandatory|optional, status: requested|approved|rejected, previousDate, proposedDate?, newDate, employeeReason?, decisionJustification?, decidedByName?, decidedAt?, noticeSentAt?, createdAt, shiftAllowed, shiftBlockedReason? }`
- queries: `listForSupervisor()` (employee requests, all statuses), `listAwaitingNotice()` (hr: approved or rejected without notice), `listForEmployee({ employeeId })` (newest first), `get({ reviewId, changeIndex })`
- mutations: `decide({ reviewId, changeIndex, accepted, justification, newDate? })` (supervisor, only on `requested`), `markNoticeSent({ reviewId, changeIndex })` → `{ dueDate }` (hr)

**B4 Internal documents** (`convex/lib/contracts/knowledgeDocs.ts`)

- query `list()` → `{ documentId, title, fileName, scope, unit?, status, error?, pseudonymized, uploadedByName, uploadedAt, indexedAt?, chunkCount }[]`
- mutations `generateUploadUrl()`, `register({ storageId, title, fileName, scope, unit? })`, `remove({ documentId })`
- action `ask({ question })` → `{ answer: string | null, citations: { kind: office|law, title, locator, documentId? }[] }`

**B5 Forum** (`convex/lib/contracts/forum.ts`)

- queries `listThreads({ kind?, criterionId? })`, `getThread({ threadId })` → `{ thread, replies } | null`
- mutations `createThread({ kind, title, body, criterionId? })`, `reply({ threadId, body })`, `report({ threadId })`

## Data hook rules

- Views import data only from `src/lib/backend/*`, never from `convex/_generated/api` for B1–B6.
- A query hook is `useX(args) → { data: T | undefined; isDemo: boolean; offline: boolean }`; `undefined` means loading. A mutation or action hook is `useX() → (args) => Promise<Returns>`, with `args` typed without `actor`.
- Hooks fill `actor` from `useDemoRole()`, so a view never passes it.
- Each hook file has a demo and an online implementation and picks one once at module load: `export const useAdviceList = online ? useDemoAdviceList : useDemoAdviceList;`. The team's swap replaces only the online branch (one line per hook). Offline (no `ConvexProvider`) the demo branch stays, so offline e2e and axe keep working.
- Demo query hooks return `data: undefined` on the first render, so every view handles the loading state before the swap.
- A view shows `DemoDataNote` when `isDemo` is true, and an offline state when `offline` is true.

**Swap PRs and the hot-files box.** `src/lib/backend/**` is under `src/lib/**`, which is on the hot-files list.
A PR that swaps a hook to the live backend therefore changes a hot file, and its author ticks
`- [ ] Zmiana plików wspólnych uzgodniona z zespołem` in the PR template (then "Re-run failed jobs").

## Tasks

Tasks 01–05 are commits of the UI contract PR. Each later task is one PR from `main`, branch `feat/<issue>-ui-<slug>`,
in its own worktree. View tasks touch their own `src/features/<dir>/**` and `e2e/a11y/<view>.spec.ts`, and set
`roles` / `startFor` / `hideInNav` in their own `feature.tsx`.

| Wave | Task                   | Screens                                 |
| ---- | ---------------------- | --------------------------------------- |
| 0    | 00-backend-contract    | contract validators and stubs (own PR)  |
| 0    | 01-design-tokens       | tokens, font, logo                      |
| 0    | 02-ui-primitives       | `src/components/ui/**`                  |
| 0    | 03-data-hooks          | `src/lib/backend/**`                    |
| 0    | 04-app-shell           | header, role tabs, side nav, footer     |
| 0    | 05-a11y-harness        | axe helper                              |
| 1    | 06-ui-static-pages     | rows 21, 22                             |
| 1    | 16-ui-advice           | row 10                                  |
| 1    | 07-ui-dashboard        | row 1                                   |
| 1    | 11-ui-conversation     | row 5                                   |
| 1    | 12-ui-observations     | row 6                                   |
| 2    | 08-ui-review-sheet     | row 2                                   |
| 2    | 13-ui-handover         | row 7                                   |
| 2    | 15-ui-deadline-shift   | row 9                                   |
| 2    | 18-ui-employee-result  | row 12                                  |
| 2    | 25-ui-forum            | row 19                                  |
| 3    | 09-ui-review-preview   | row 3                                   |
| 3    | 14-ui-handover-package | row 8                                   |
| 3    | 19-ui-director         | row 13                                  |
| 3    | 20-ui-hr-office        | row 14                                  |
| 3    | 21-ui-hr-assign        | row 15                                  |
| 4    | 10-ui-review-ai-iprz   | row 4                                   |
| 4    | 22-ui-employee-card    | row 16                                  |
| 4    | 23-ui-settings         | row 17                                  |
| 4    | 24-ui-knowledge-docs   | row 18                                  |
| 4    | 26-ui-login            | row 20                                  |
| 5    | 17-ui-employee-cycle   | row 11                                  |
| 5    | 27-nav-roles-cleanup   | `notes` becomes `devOnly`, menu cleanup |

Chains on shared files: `convex/reviews/*` and `src/features/review/**` 07 → 08 → 09 → 10;
`convex/observations/*` 12 → 13 → 14; `src/features/objections/**` 18 → 19; `convex/employees/*` 21 → 22.
