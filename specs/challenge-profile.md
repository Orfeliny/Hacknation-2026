# Challenge profile switcher (#29)

Issue: #29 · Branch: `feat/29-challenge-profile` · Status: IN PROGRESS

## Goal

One codebase goes to two committees: KPRM ("Asystent") and MC ("Kompas"). A profile shows each committee only the
modules that matter to it, so the menu does not look like a kitchen sink.

## Scope

- In (contract PR, hot files only): `src/lib/challengeProfile.ts`, `src/app/router.tsx`, `src/app/Layout.tsx`,
  `src/app/ProfileStart.tsx`, tests in `src/app/` and `src/lib/`, this spec.
- Out: any module directory. Each module adds its own `profiles` line to its `feature.tsx` in its own PR. The
  Kompas path-choice page (#21). Detail routes without a menu entry (see "Open point").

## Decisions

- D1: profiles are `asystent`, `kompas` and `all`; `all` is the default and shows every module.
- D2: a feature declares `profiles: ["kompas"]`, `["asystent"]` or both. No `profiles` field means it shows in every
  profile, so no existing feature changes. An unknown or empty value fails `collectFeatures` with the field path.
- D3: the profile is kept in `localStorage` (same pattern as the demo role) and set by `?profil=kompas` or
  `?profil=asystent` in the URL, so a submission link opens the right menu. An unknown `?profil=` value is ignored.
- D4: the profile filters the menu only. Routes stay reachable by URL, so a link never breaks.
- D5: the start page adds a card per profile (Kompas: choose the path, Asystent: my team), rendered next to the
  existing start page in the router, not inside it. A card shows only when its target route exists. Until #21 adds
  a path-choice page, the Kompas card points to `/oceny`; changing it is one line in `PROFILE_START`.
- D6: the switcher is a select in the header, next to the demo role.

## Open point

The comment on #29 asks for a way to keep detail routes (e.g. `/ocena/:id`) out of the menu (`nav: false` or several
routes per feature). It is not in the acceptance criteria, so it is left out of this PR and goes to the team.

## Acceptance criteria

- [ ] `?profil=kompas` and `?profil=asystent` show only that profile's modules in the menu.
- [ ] A feature without `profiles` is always visible (router test).
- [ ] An invalid `profiles` value produces a clear validation error (test).
- [ ] The start page depends on the profile (Kompas: path choice, Asystent: my team).
- [ ] `npm run verify` passes.
