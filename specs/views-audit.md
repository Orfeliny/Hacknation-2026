# Spec v2: view audit and prototype fidelity (#168)

Source of findings: `audit/<group>.md` in this orch dir (`a`..`f`, 186 numbered items). `a-9` = file
`audit/a-supervisor-home.md`, item 9. The audit text is the detailed "what"; this spec decides scope, grouping,
order and acceptance. v2 resolves `spec-thread.md` round 1 (findings 1–17).

Design reference: `docs/prototyp/*.dc.html` + rules in `docs/prototyp.md`. Repo rules: `CLAUDE.md`,
`specs/ui-azymut.md` (no route guards; backend enforces access; ids travel in the query string).

## 1. Scope

In scope:

- Every crash, error screen, dead end, broken link, wrong/duplicated demo data, Polish language error and WCAG 2.1 AA
  problem in the audit.
- Visual drift from the prototype for elements that exist or can be built from data the app already has (existing
  tables, queries, rule pack): layout, order, spacing, type scale, colours, copy, badges, buttons, empty states, titles.
- Demo data that populates every role's views.
- Side nav: dev pages hidden in every profile; in profile "Asystent KPRM" each role's nav equals the prototype (§5 T02 table).

Out of scope → §7 (the CTO asks Michał before creating any issue): anything needing a new schema field/table, a new
`decide`-style argument that changes the legal flow, a new integration or a new page. Mobile layouts. Route guards
(where the audit asks for one, c-1 / e-23: the page shows a friendly "view for role X" card to other roles, and if a
backend mutation accepts a wrong-role write, fixing the **backend** is in scope).

Rules:

- R1. Borderline item: buildable without schema change → in scope; else §7, stated in the thread.
- R2. Every cited item ends as `fixed`, `won't fix (reason)`, `no fix (info)` or `moved to §7`. Nothing silently dropped.
- R3. No control that silently does nothing. A prototype button either works with existing functions/data, or is
  omitted and listed in §7, or (only where the prototype layout depends on it) renders `aria-disabled` with a visible
  reason. The UI never promises behaviour the app lacks (c-8 hint, c-21 aside/success text).
- R4. Bad/foreign ids: every view that reads `?ocena=`, `?pracownik=`, `?zmiana=`, `?porada=`, `?wpis=`, `?obszar=`
  must render its friendly card **with zero console errors** for `abc`, a well-formed foreign id and a deleted id.
  Strategy: skip the query until the id is known from a list the view already loads (`useQuery(fn, ok ? args : "skip")`)
  or return `null` from the backend query for denied/unknown ids. Where the validator lives in `convex/lib/contracts/**`
  (hot) only the client-side skip is allowed. C1 is a safety net, not the fix.
- R5. Wave-2 tasks do not edit nav fields (`navLabel`, `order`, `roles`, `profiles`, `hideInNav`, `navGroup`,
  `navHide`) in `feature.tsx`; T02 owns them.
- R6. One stage-label source: backend `stageLabel`. Views and print reuse it (b-30, e-19).

## 2. Constraints

- Hackathon day 22.11.2026. Small atomic tasks, one commit each, Conventional Commits; PR bodies `Closes #168`.
- Hot files (`.github/hot-files.txt`) change only in PR A. PR A also carries the `specs/ui-azymut.md` shell-rules
  update for the new registration fields (non-hot doc; the PR template line "Zmiana plików wspólnych uzgodniona z
  zespołem" is ticked). PR B touches no hot file.
- Prefer a vetted open-source library over hand-written generic code; never add a dependency without vetting it
  (`oss-first` skill). No new dependency is expected: dates via `Intl.DateTimeFormat("pl-PL")`, plurals via
  `Intl.PluralRules("pl")`, parsing via Zod (already a dependency). No Polish name-inflection library (c-2: reword).
- No schema change. Comments minimal. Tests for every non-trivial change. `npm run verify` green before ready.
- Node 24: `fnm env --shell powershell | Out-String | Invoke-Expression; fnm use 24.22.3`.
- Never commit `convex/tmpAuditFix.ts`, `convex/_generated/**` changes caused by it, or `.env.local`. The CTO removes
  `tmpAuditFix.ts` and regenerates after T01a lands.
- A task that adds or removes a file under `convex/` never runs in parallel with another `convex/` change (CLAUDE.md).
- Parallel coders share the worktree and the local backend. A coder may report "typecheck/lint red only in <other
  task's files>"; its own files must be clean. Commit only own files: `git commit -m … -- <paths>`.

## 3. Assumptions

- A1. Seed migration (Michał, rule ii): `convex/seed.ts` V2 (marker `__DEMO_SEED_V2__`). When V1 is present it
  **deletes only rows that `seed:seed` V1 itself created**, then inserts V2 data keyed on the personas from
  `convex/employees/seed.ts` (by `seedKey`). It never sets `demoPersona` and never touches other rows. Second run is
  a no-op. Run order (in the seed header): `employees/seed:run` → `seed:seed` → feature seeds.
  V1 identification, per table: `employees` **only** by `seedKey ^demo-employee-` (never through a reference);
  transitively every non-employee row whose owning reference (`employeeId`, `authorId`, `recipientId`, `reviewId`)
  points to a deleted employee/review (incl. `auditLog`, `aiInteractions`, `mailMessages`, signatures, objections,
  drafts). Rows pointing at a V1 employee only via `supervisorId` / `evaluatorId` / `actorId` are kept and listed in
  the seed's return value for manual fixing (T01a test covers a persona whose supervisor was reassigned to a V1 person);
  `adviceArticles` by slug `demo-poradnik-*`; `developmentOptions` by the V1 description text + V1 title set;
  `knowledgeChunks` by `sourceId "demo-przewodnik"`; `regulationWatch` by `eliId "demo-eli-przepis"`; `notes` by the
  V1 marker and the V1 demo text. Deleting demo `auditLog` rows is accepted (confirmed by Michał, 22.11.2026).
- A2. Prototype persona names/dates are illustrative; the app keeps its personas.
- A3. "Administrator" role tab stays (spec addition), styled like the others.
- A4. `/forum` and `/rozwoj` stay separate; `/forum` h1 becomes "Wątki forum".
- A5. Native date inputs are replaced by C4 `DateField` (`dd.mm.rrrr`) at a-16, e-12 and c-19.
- A6. Page titles via C4 `PageTitle` component (React 19 `<title>`), "<Screen> — Azymut".
- A7. Profiles "Wszystkie moduły" and "Kompas MC": unchanged except Notatki and Model domeny hidden from nav.
- A8. d-22 "Termin nowej oceny" (new `decide` argument) → §7. e-25 AI settings form: intentional divergence, only the
  pseudonymisation box colour follows the prototype. c-15 "urlopie rodzicielskim" entry is an intentional wellbeing
  example: rephrase text, keep `wellbeing: true`.

## 4. Acceptance criteria (whole change)

- AC1. After reseeding, every view in the `specs/ui-azymut.md` map renders populated for its role, with zero console
  errors and no default error screen for any of the 5 roles on any registered route, including R4 id cases.
  Verified by the CTO capture script (`capture3/`).
- AC2. Every cited item has an R2 status in its thread; info-only items (f-6, f-12, f-20, f-28, b-22, c-10, d-8) are
  closed by the CTO as `no fix (info)`.
- AC3. At 1440×900 each screen matches the prototype in layout, section order, type scale (h1 31px/700 via
  `PageHeader`, section h2 via token `text-section` 22px), colours (status colour only on alert text + icon; cards and
  badges neutral, strong border token `border-strong` = #767676) and copy.
- AC4. PR A = hot files + `specs/ui-azymut.md` + `e2e/print.spec.ts` only; PR B = no hot file.
- AC5. `npm run verify` green on both PRs; new/changed logic has tests.

## 5. Tasks

**PR A** `chore/168-shell-contract`, worktree `wt-168-shell-contract` from `origin/main`.
**PR B** `fix/168-views-audit`, worktree `wt-168-views-audit`, rebased onto PR A once A is approved.

Per task the coder implements only its items, adds tests, runs `npm run lint`, `npm run typecheck`,
`npx vitest run <paths>`, checks the view live (PR B: `http://localhost:5199`; PR A: its own vite, see the task prompt),
saves before/after Playwright screenshots under `tasks/<nn>-<slug>/`, commits only its files, and reports in
`tasks/<nn>-<slug>/thread.md` with an item-by-item status table. Per-task AC on top of §4: R2–R4 hold; the page title
uses `PageTitle` (PR B); tests cover new logic (empty, denied, bad-id, plurals, deep links).

### PR A — shell contract

**C0 — print without the app chrome (reported by Michał: PDFs print with the side nav).** Files:
`src/app/{Layout,SideNav,Footer,SkipLink}.tsx` + `src/app/print.test.tsx` + `e2e/print.spec.ts`. Cause: only
`src/features/print/printStyles.ts` hides `header, [role="status"]`; the side nav, footer, skip link and overlays
stay on paper and `main` keeps its column next to the nav.
AC: in `@media print` the shell renders only `main`: side nav, header, footer, skip link, offline banner and overlays
(onboarding) are `print:hidden`, the layout wrapper drops its flex/gap/padding/max-width so `main` spans the page;
applies to every route, not just `/druk`. Header, offline banner and overlays are hidden through wrappers in
`Layout.tsx` (C3's files untouched). Tests: unit test asserts `print:hidden` on each shell part; Playwright e2e
(`e2e/print.spec.ts`, offline mode) with `page.emulateMedia({ media: "print" })` on `/druk` and one other route
asserts nav, header, footer and the onboarding dialog are not visible and `main` spans the page width. T07c then
removes the now-duplicate shell rules from `PRINT_CSS` (keeps `@page`); that also removes the `[role="status"]`
hiding, which fixes b-34. First task of PR A, ships before the rest. C2a and C2c edit `Layout.tsx` after C0: their
AC includes "C0 print checks stay green"; the bare-layout header is `print:hidden` too.

**C1 — error boundary (safety net).** Files: `src/app/router.tsx`, new `src/app/RouteError.tsx` + test.
AC: a thrown error in a route renders an in-shell card (h1, plain Polish, link to the role's start page); `ConvexError`
`code: "denied"` shows its `message` as an info card; `ArgumentValidationError` (malformed id) shows "Nie znaleziono";
header and nav stay usable; no React Router default screen; tests for the three cases.

**C2a — layout + type scale.** Files: `src/app/Layout.tsx`, `src/components/ui/{PageHeader,Card}.tsx`,
`src/index.css`, tests. Items: a-5, a-6, d-9, e-preamble, f-1 (PageHeader), f-2 (body), f-11.
AC: main `max-w-[1180px] px-10 py-8` beside the nav; `PageHeader` h1 31px/1.2/700 −0.01em; tokens `text-section`
(22px) and `border-strong` (#767676) in `@theme`; `Card` radius/padding per d-9; base `a` primary / hover.

**C2b — side nav.** Files: `src/app/SideNav.tsx` + test. Items: a-1 (footnote), a-2, e-29, f-4 (no count pill: §7).
AC: nav 256px with right border; items ink, no underline, active `bg-surface-muted text-primary font-bold`; only the
longest matching path is active (one `aria-current`); rules footnote at the nav bottom.

**C2c — registration fields.** Files: `src/app/{router,navigation,Layout}.tsx/ts`, `specs/ui-azymut.md`, tests.
Items: a-1 (divider), f-26 (bare option). AC: new fields documented in `specs/ui-azymut.md` shell rules:
`navGroup?: "work" | "help"` (default `work`; groups render `work` then `help`, sorted by `order` inside each, a
divider between them only when both are non-empty);
`navHide?: { profile: FeatureProfile; roles: DemoRole[] }[]` (hide for these roles in this profile; route stays
registered); `layout?: "bare"` (Layout renders its own minimal header: logo + "Azymut" only, no tabs, nav or footer
links; `Header.tsx` untouched). Tests for each field.

**C3 — header, role tabs, footer, offline banner.** Files: `src/app/{Header,RoleTabs,Footer,OfflineBanner}.tsx` + tests.
Items: a-3, a-4, f-2 (header/footer full width), f-3, f-5, f-7 (version line only), f-8.
AC: full-width header in one row at 1440px: logo link to `/` + "Azymut" (primary) with office name stacked; segmented
role control (`#EBEBEB` pill, active white chip, no underline); right group AI badge + initials avatar + stacked
name/position; Profil select and "Resetuj onboarding" inside a "Narzędzia demo" disclosure; footer full width, muted
14px, "© 2026 [NAZWA URZĘDU] · Azymut · wersja reguł 2016-04-23"; offline banner neutral (icon + text, no fill) with
user copy. Runs after C2c.

**C4 — shared helpers.** Files: `src/lib/format.ts` + test, new `src/lib/plural.ts` + test, new
`src/components/ui/PageTitle.tsx` + test, new `src/components/ui/DateField.tsx` + test.
Items: a-13 (format part), c-27 / e-5 (plural), A5, A6.
AC: `formatLongDate` → "piątek, 21 listopada 2026"; `formatShortWithWeekday` → "pt 28.11.2026"; `plural(n, {one,
few, many})` correct for 1, 2, 5, 12, 22, 1000; `<PageTitle>Pulpit</PageTitle>` → `document.title` "Pulpit — Azymut";
`DateField` labelled text input `dd.mm.rrrr`, `inputMode="numeric"`, Zod parse to ISO built from parts (never
`new Date("yyyy-mm-dd")`), rejects 31.02, shows a Field error. Parallel with C2/C3 (disjoint files).

### PR B — views

| #    | Task                                    | Files (only these)                                                                                                                            | Items                                                                                                                                                                                                                                         |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01a | Seed V2: personas + V1 cleanup          | `convex/seed.ts`, `convex/seed.test.ts`                                                                                                       | F0.1, a-caveat                                                                                                                                                                                                                                |
| T01b | Seed: dedupe and correct content        | `convex/seed.ts`, `convex/observations/seed.ts`, `convex/growth/{adviceSeedData,optionsSeedData}.ts`, `convex/forum/seedData.ts`, their tests | a-21, a-23 (data: IPRZ article on an existing topic), a-24 (readable `sourceRef`), b-1, e-6, b-31 (stored average vs ratings), c-15 (data, A8), c-18, d-27, f-13 (data), f-23 (data)                                                          |
| T01c | Seed: populated flows per role          | `convex/seed.ts`, `convex/seed.test.ts`                                                                                                       | d-1 (Anna: one review at `opening`, one at `signing`), d-19 (one pending + one overdue objection), shift requests for the supervisor, one `evaluator_change` handover case for a supervisor report, e-14 (only if expressible without schema) |
| T02  | Nav per profile (after PR A)            | `src/features/*/feature.tsx` nav fields only                                                                                                  | a-1 (items), b-24 (nav part), d-26, f-9, f-10                                                                                                                                                                                                 |
| T03  | Pulpit                                  | `src/features/dashboard/**`                                                                                                                   | a-7, a-8..a-12 (a-11 handover card: unit test with a stubbed non-empty `handoverPlan`; CTO checks live after T10), a-13 (page), a-14                                                                                                          |
| T04  | Przesunięcie terminu                    | `src/features/deadline-shift/**`                                                                                                              | a-7, a-15..a-19, R4 `?ocena=&zmiana=` (client skip)                                                                                                                                                                                           |
| T05  | Porady                                  | `src/features/advice/**`, `convex/growth/constants.ts` (labels only, no new topic)                                                            | a-7, a-20, a-22, a-23 (labels), a-24 (UI), a-25..a-28                                                                                                                                                                                         |
| T06a | Arkusz C: structure                     | `src/features/review/{ReviewPage,ReviewWizard,ReviewPreview,SheetHeader,StageNav,FormalCheck,AverageSummary}.tsx` + tests                     | b-2, b-3, b-4, b-5, b-11                                                                                                                                                                                                                      |
| T06b | Arkusz C: writing step                  | `src/features/review/{writing,AiHints,IprzSuggestions,steps}.tsx`, new local compact rating component + tests                                 | b-6, b-8, b-9, b-10, b-15 (local only), b-16, b-17                                                                                                                                                                                            |
| T06c | Arkusz C: bugs + backend                | `convex/rules/validateReview.ts`, `convex/reviews/queries.ts`, `src/features/review/{ReviewPage,ReviewPreview,steps}.tsx` + tests             | b-12, b-13 (R4), b-14                                                                                                                                                                                                                         |
| T07a | Pierwsza ocena                          | `src/features/first-review/**` (not feature.tsx nav fields), `convex/firstReview/rules.ts`                                                    | b-18..b-23                                                                                                                                                                                                                                    |
| T07b | Projekt treści                          | `src/features/drafting/**` (not feature.tsx), `convex/drafting/errors.ts`                                                                     | b-24 (page gate, R4), b-25..b-29                                                                                                                                                                                                              |
| T07c | Druk                                    | `src/features/print/**`, `convex/print/queries.ts`                                                                                            | C0 follow-up (drop duplicate shell rules from `PRINT_CSS`), b-30 (R6), b-31 (blank office name), b-32, b-33 (R4), b-34                                                                                                                        |
| T08  | Rozmowy                                 | `src/features/conversation/**`                                                                                                                | c-1..c-10 (c-2 reword; c-8 no false promise)                                                                                                                                                                                                  |
| T09  | Dziennik obserwacji                     | `src/features/observations/**`, `convex/observations/{queries,mutations,limits}.ts`                                                           | c-11..c-14, c-15 (copy), c-16, c-17, c-19 (DateField), R4 `?pracownik=`                                                                                                                                                                       |
| T10  | Zmiana oceniającego + pakiet            | `src/features/handover/**`, `src/features/handover-package/**`, `convex/observations/queries.ts`                                              | c-20, c-21 (copy only), c-22..c-31 (c-29 R4)                                                                                                                                                                                                  |
| T11  | Moja ocena                              | `src/features/me/**`, `convex/me/queries.ts`                                                                                                  | d-2..d-8                                                                                                                                                                                                                                      |
| T12a | Wynik oceny                             | `src/features/employee-result/**`, `src/features/me/StageTimeline.tsx`, shared hero in `src/features/me/`, `convex/me/queries.ts`             | d-10..d-15, d-16 (c: hint link only), d-17, d-18, d-12 (R4: null not throw)                                                                                                                                                                   |
| T12b | Rozstrzygnięcie sprzeciwu               | `src/features/objections/**`, `convex/objections/queries.ts`                                                                                  | d-20 (detail via `?ocena=` on `/sprzeciwy`), d-21 (b, c without "Poproś o wyjaśnienie", d, e), d-23, d-24, d-25                                                                                                                               |
| T13  | Panel kadr                              | `src/features/hr-office/**`                                                                                                                   | e-1..e-10                                                                                                                                                                                                                                     |
| T14  | Przypisanie oceniającego                | `src/features/hr-assign/**`                                                                                                                   | e-11, e-12 (AssignForm), e-13, e-14 (UI), e-15                                                                                                                                                                                                |
| T15  | Karta pracownika                        | `src/features/employee-card/**`                                                                                                               | e-12 (Staffing, NewCycle), e-16..e-22 (incl. e-18 fixtures, e-19 R6), R4 `?pracownik=`                                                                                                                                                        |
| T16  | Ustawienia + Dokumenty                  | `src/features/{settings,knowledge-docs}/**`, the settings backend mutation only if it accepts a wrong-role write                              | e-23..e-28 (e-25 A8, e-28 R4), e-30                                                                                                                                                                                                           |
| T17  | HR partner, Model AI                    | `src/features/{hr-partner,ai-status}/**`, `convex/hrPartner/*.ts` (text only, no tests' data)                                                 | e-31..e-34                                                                                                                                                                                                                                    |
| T18  | Forum rozwoju                           | `src/features/growth/**`                                                                                                                      | f-13 (UI), f-14..f-19 (f-19 R4), R4 `?wpis=`                                                                                                                                                                                                  |
| T19  | Forum, Blog, Kompas                     | `src/features/{forum,blog,assistant}/**`                                                                                                      | f-21..f-25                                                                                                                                                                                                                                    |
| T20  | Logowanie, Zasady, Deklaracja, Przepisy | `src/features/{login,style-guide,accessibility-statement,regulations}/**`, `docs/zgloszenie/deklaracja-dostepnosci.md`                        | f-1 (login), f-26 (uses `layout: "bare"`), f-27 (demo parts), f-29..f-32                                                                                                                                                                      |

T09 and T10 replace local `entryNoun` copies with C4 `plural()`.

**T02 AC: nav in profile `asystent`, in order** (via `navGroup` / `navHide` from C2):

| Role       | Nav                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------- |
| supervisor | Pulpit, Oceny okresowe, Rozmowy, Dziennik obserwacji, Zmiana oceniającego │ Forum rozwoju, Porady |
| employee   | Moja ocena │ Forum rozwoju, Porady                                                                |
| hr         | Pulpit, Przypisz oceniającego, Dokumenty urzędu, Ustawienia │ Forum rozwoju                       |
| director   | Sprzeciwy │ Forum rozwoju                                                                         |
| admin      | Dokumenty urzędu, Ustawienia │ Forum rozwoju                                                      |

(│ = divider. Employee Porady and HR Dokumenty urzędu are kept: required by `docs/prototyp.md` "Znane braki" and the
employee advice audience.) Hiding HR partner in asystent needs no start-page change: `ProfileStart` is unreachable
while every role has a `startFor`. Notatki and Model domeny `hideInNav: true` everywhere. Growth order < advice order.
Other profiles: A7. Test: `src/features/navigation.test.ts` loads features via `import.meta.glob` + `collectFeatures`
and checks `visibleNav` for 5 roles × 3 profiles against this table.

**Ordering.**

- PR A: C0 → C1 → C2a → C2b → C2c → C3; C4 parallel with C1–C3 (disjoint files).
- PR B wave 1 (now, parallel with PR A): T01a → T01b → T01c. Then the CTO removes `tmpAuditFix.ts`, regenerates and
  reseeds the local backend.
- After PR A approved: rebase PR B, then T02 and wave 2: T03, T04, T05, T07a, T07b, T07c, T08, T13, T14, T15, T16, T17,
  T18, T19, T20 (≤ 4 at a time; `convex/` add/remove never in parallel), and the chains T06a → T06b → T06c,
  T09 → T10, T11 → T12a → T12b (T12b may run with T12a if it does not touch `me/`).

## 6. Verification by the CTO

Rerun the capture script for 5 roles (`capture3/`) + R4 id cases; confirm AC1; compare with the prototype; `npm run
verify` on both branches; CTO PR review (seams, duplication, drift). Findings become new tasks.

## 7. Candidate follow-up issues (ask Michał before creating)

- Objection: criteria checkboxes + "Zapisz szkic" (d-16), "Poproś o wyjaśnienie" (d-21a/c).
- Director decision: "Termin nowej oceny" argument (d-22).
- Review: per-criterion justification field (b-7).
- Handover: persist the "Ocena" choice (c-21).
- Conversation outcomes written to the observation journal (c-8).
- Header notification bell with counts; nav count pill on "Zmiana oceniającego" (f-4).
- Login: AD button + 2FA aside (f-27).
- Footer pages: Polityka prywatności (RODO), Pomoc, Kontakt z administratorem (f-7).
- Growth catalogue fields "Miejsca", "Tryb", "Termin" (f-14, f-15); "Zapisz się" enrolment (f-14).
- Advice topic "Wnioski IPRZ" (a-23, schema validator).
- Buttons without backend from R3 (e-2, e-8, e-13, e-16, e-17, b-8, c-11) — coders append the ones they omit.
