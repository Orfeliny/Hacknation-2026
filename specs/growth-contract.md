# Contract: development base ("Baza rozwoju") data

Issue: #56 · Branch: `chore/56-contract-growth` · Unblocks: #57 (catalog), #58 (advice)

## Goal

Land the shared data contract for the development base in one small additive PR, so the catalog of
development options (#57) and the advice articles for supervisors (#58) can be built in parallel
without touching hot files. Source: KPRM challenge section 3.1 (suggest trainings and support based
on the areas to develop from a review) and the 2026-11-21 interviews (no central base of
development forms today; supervisors want short advice articles).

## Scope

- In: `convex/growth/tables.ts` (`growthTables`), `convex/growth/constants.ts` (literal lists,
  Polish labels, validators), a shared `criterionId` validator in `convex/lib/validators.ts`, one
  import and one spread in `convex/schema.ts`, regenerated `convex/_generated`, contract tests,
  owner rows in `docs/architecture.md`, the table list in `convex/schema.test.ts` and the
  `/dev/model-domain` metadata (new area "Baza rozwoju"), which tests keep in sync with the schema.
- Out: queries, mutations, seed data, pages, new npm dependencies.

## Tables

`developmentOptions` (owner #57)

| Field                                         | Type                                                                                               | Required |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| `title`, `description`                        | string                                                                                             | yes      |
| `form`                                        | `szkolenie` \| `kurs` \| `mentoring` \| `material` \| `zadanie_rozwojowe` \| `wymiana_doswiadczen` | yes      |
| `criterionIds`                                | array of `criterionId`                                                                             | yes      |
| `level`                                       | `podstawowy` \| `sredni` \| `zaawansowany`                                                         | yes      |
| `cost`                                        | `bezplatne` \| `platne` \| `brak_danych`                                                           | yes      |
| `costNote`, `provider`, `url`, `durationNote` | string                                                                                             | no       |
| `source`                                      | `demo` \| `material_kprm` \| `urzad`                                                               | yes      |
| `sourceRef`                                   | string, e.g. a document name from `docs/materialy_md/`                                             | no       |
| `active`                                      | boolean                                                                                            | yes      |

`adviceArticles` (owner #58), index `by_slug`

| Field                      | Type                                                                                                      | Required |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| `slug`, `title`, `summary` | string                                                                                                    | yes      |
| `topic`                    | `informacja_zwrotna` \| `rozmowa_oceniajaca` \| `dobrostan` \| `docenianie` \| `kryteria_oceny` \| `inne` | yes      |
| `criterionIds`             | array of `criterionId`                                                                                    | no       |
| `sections`                 | array of `{ heading, paragraphs: string[], bullets: string[] }`                                           | yes      |
| `readingMinutes`           | number                                                                                                    | no       |
| `source`                   | same as above                                                                                             | yes      |
| `sourceRef`                | string                                                                                                    | no       |
| `published`                | boolean                                                                                                   | yes      |

## Decisions

- G1: `criterionId` is a `v.union` of one `v.literal` per entry in `RULES_2016.catalog`, so the
  database itself rejects ids outside the 2016 pack. It lives in `convex/lib/validators.ts` because
  both tables (and later other modules) share it; its inferred type equals `CriterionId`.
- G2: article content is structured data (`sections`), not Markdown, so rendering needs no new npm
  dependency.
- G3: literal lists are `as const` arrays in `constants.ts`; validators and label records are built
  from them, so UI filters and the schema cannot drift.
- G4: required means a row is meaningless without it; everything else is optional, so the schema
  only grows after merge.

## Contract rules for modules

- A row with `source: "demo"` shows a visible "Dane demonstracyjne" label in the UI
  (`GROWTH_SOURCE_LABELS.demo`).
- No row contains an invented provider or URL: `provider` and `url` stay empty until a real source
  names them.

## Acceptance criteria

- [x] `convex/growth/tables.ts` exports `growthTables` with both tables; `convex/schema.ts` gains one
      import and one spread.
- [x] Additive only; `npx convex codegen` and `npm run codegen:check` pass.
- [x] `convex/growth/tables.test.ts`: valid rows pass; unknown `form` or `source` is rejected.
- [x] Criterion ids outside the 2016 pack are rejected in both tables.
- [x] Owner rows in `docs/architecture.md`.
- [ ] `npm run verify` green (e2e runs in CI).
