# Onboarding of a new user (#120)

Issue: #120 · Status: implemented in two stacked PRs on top of the Azymut contract (#88)

## Goal

A new user sees a short, step-by-step dialog for their role on the first visit. In this demo the dialog is
shown once per demo role, because there is no login yet (#42): switching to a role not seen before shows its
onboarding as a first login would.

## PR split (hot-files rule)

1. `chore/120-modal-onboarding-contract` (shared files only): `src/components/ui/Modal.tsx` (native
   `<dialog>`), `src/lib/onboarding.ts` (per-role flag), an optional `overlay` on a feature (`src/app/router.tsx`,
   `Layout.tsx`) and the "Resetuj onboarding" button in `Header.tsx`.
2. `feat/120-onboarding`: `src/features/onboarding/**`, the e2e fixture and spec, this spec.

Out: real accounts and storing progress in Convex (after #42), a spotlight tour, mobile, schema changes, any
new dependency.

## Decisions

- D1: a native `<dialog>` opened with `showModal()` gives the focus trap, Esc and the inert background. Esc counts
  as skipping.
- D2: the flag is `onboardingDone:<role>` in `localStorage`, with an in-memory fallback when storage is blocked
  (the pattern of `demoRole`). Reset clears the flag of the current role only.
- D3: a feature may register an `overlay` element, rendered next to the layout on every page. The onboarding
  dialog is one; this keeps the shell free of imports from a feature.
- D4: 3 to 5 steps per role, in Polish, describing only modules that exist: supervisor (evaluations, first
  evaluation in the Kompas profile, HR partner and development), employee (my assessment, objection with the
  7-day term, development), HR (evaluations and objections read-only, content management, regulations),
  director (objections with the 14-day term, evaluations, regulations), admin (AI model, regulations).
- D5: the step "Pierwsza ocena" appears only in profiles that show that module (`profiles: ["kompas"]`, the same
  rule as the menu).
- D6: the same steps are also a page, `/przewodnik` (hidden from the menu), so they can be read without a modal;
  "Pokaż jako okno" there reopens the dialog.
- D7: e2e specs mark every role's onboarding as seen through a shared fixture, so the dialog does not cover the
  page under test; `e2e/onboarding.spec.ts` checks the dialog itself.

## Deviations from the issue

- The flag key is `onboardingDone:<role>` with value `1` (the issue said `onboarding:<rola>` = `done`); only
  `src/lib/onboarding.ts` and the e2e fixture use it.
- A step has no optional `path`: the only conditional step, "Pierwsza ocena", uses `profiles`, which follows the
  menu. The behavioural calculator step (#19) is not planned in because that module does not exist yet; add a
  step with a `path` check when it lands.
- The Rozwój step does not mention advice articles: they have no reader page yet (PR #124).

## Acceptance criteria

- [x] The dialog opens by itself for a role that has not seen it, once per role (tests).
- [x] Back, Next, Skip, "Zaczynam" and Esc work; the step indicator reads "Krok n z N" (tests).
- [x] Switching to an unseen role shows its onboarding; "Resetuj onboarding" restarts the current role's (tests).
- [x] The Kompas step is shown only in a profile that shows the first-review module (test).
- [x] Axe finds no serious violation with the dialog open and on the guide page (e2e).
- [x] No new npm dependency; `npm run verify` is green.
