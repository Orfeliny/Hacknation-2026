# Print and export of the review sheet (#18)

Status: DRAFT, implementation starts on this spec · Issue: #18 · Branch: `feat/18-print-sheet`

## Goal

Let a user print a periodic review sheet (A, B or C) as a page that matches the regulation's form, and
download the same review as documented JSON. PDF comes from the browser's "Print → Save as PDF", so
there is no new dependency. JSON is the seed of an EZD / HR-system integration.

## Scope

- In: a print page that renders the three sheets from stored review data; a read access rule for the
  print and export queries; a JSON export with a Zod schema; `@media print` styles for A4.
- Out: editing the review (#12); signing and signature detection (#38); writing the audit log for
  exports (#39 owns `auditLog`, see Assumption 7); server-side PDF generation; the rules themselves (#10).

## Assumptions

1. **Route.** The issue names `/ocena/:id/druk`. `src/app/router.tsx` builds the menu from every feature
   and has no way to hide an entry, so a path with `:id` would put a dead link in the menu. The feature
   is registered as `/druk` and takes the review in the query string: `/druk?ocena=<reviewId>`. Without
   it the page lists the reviews the current role may print. Changing the router is a hot-file PR, so it
   is left to the team (#12 links to `/druk?ocena=<id>`).
2. **Labels come from the rules pack of #10** (`RULES_2016` in `convex/rules/pack2016.ts`: criterion
   names, the five-step scale, overall levels with `maxAverage`). The query returns ids and
   `rulesVersion`; `sheetModel.ts` resolves labels. #10 is PR #46 (draft, clean against `main`). Tasks
   1 and 3 do not need it; task 2 starts after it is merged. If it is not merged by then, ask the team.
3. **Office name** (D9 of `specs/contract-domain.md`) is read from the Convex env var `OFFICE_NAME`,
   default `Nazwa urzędu`. Set it with `npx convex env set OFFICE_NAME "<name>"`.
4. **Who may read** a review's print/export: its evaluator, its employee, and the roles `hr`, `director`
   and `admin`. Everyone else gets an error. Observations, self-notes and AI drafts are never exported.
5. **Any stage can be printed** (the automated sheet B allows printing at any time). Fields not filled yet
   print as empty lines, exactly like the paper form.
6. **Sheet differences** (field schemas of PR #44): A has 6 mandatory criteria, no "komórka
   organizacyjna" and an objection addressee field; B and C have 5 mandatory criteria, the unit, and the
   fixed text "do dyrektora generalnego urzędu". Parts "previous review" and III only appear for an
   official (`employees.corpsRole === "official"`); part III only when `promotionRequest.requested`.
   **Contract gap:** the addressee of the objection on sheet A is stored only in `objection.addressee`,
   which exists once an objection is filed. Before that the evaluator has nowhere to record it, so the
   printed field is empty until then. A new optional `reviews` field would fix it; that is a contract PR
   for the team, not part of this issue.
7. Printing or exporting is an auditable action (`auditLog.action: "export"`). Until #39 lands this
   module writes nothing; #39 hooks the query.
8. The A4 fit cannot be proven in jsdom. It is checked once in Chrome and attached to the PR as a
   screenshot, using a development-only demo review (`/druk?ocena=demo`, dropped from production builds).

## Tasks

1. Backend (files: `convex/print/queries.ts`, `convex/print/print.test.ts`, `convex/_generated/**`):
   `listPrintable` and `getSheet` with the access rule of Assumption 4 and the field set below.
2. Model and export (files: `src/features/print/sheetModel.ts`, `exportSchema.ts`, and tests): turn the
   query result plus the rules pack into a render model, and into the JSON export (Zod, `schemaVersion: 1`).
3. Page (files: `src/features/print/feature.tsx`, `PrintPage.tsx`, `SheetView.tsx`, `print.test.tsx`):
   sheet layout, toolbar (print, download JSON), print styles, offline message, dev demo review.
4. Check: Chrome A4 screenshot, `npm run verify`, reviewer subagent against this list.

`getSheet` returns: office name, sheet, stage, employee and evaluator (name, position, unit), due date,
opening conversation date, evaluation conversation date, period, additional criteria, ratings with
justifications, average, overall level and result, justification, previous review, development plan,
promotion request with the employee's grade data, signatures (role, place, date, deemed
acknowledgement), objection addressee and `rulesVersion`.

## Acceptance criteria

- [ ] `getSheet` returns the review to its evaluator, its employee, `hr`, `director` and `admin`, and
      throws for any other actor (convex-test, one case per role).
- [ ] `listPrintable` returns only the reviews the actor may read, at most 50 (convex-test).
- [ ] The rendered sheet contains every field of the regulation's sheet for A, B and C: criteria,
      ratings, average, level, result, justification, development conclusions, previous review,
      signatures with places and dates (component tests, one per sheet).
- [ ] A shows 6 mandatory criteria and no unit; B and C show 5 and the unit (component tests).
- [ ] The selected rating of every criterion and the matching overall level are marked with `X`
      (`sheetModel` unit test with a fixed average per level boundary).
- [ ] "Previous review" and part III are rendered only when the rules in Assumption 6 apply (tests).
- [ ] Print styles hide the header, the offline banner and the toolbar and set an A4 page
      (test on the stylesheet text and on the marker class).
- [ ] On A4 in Chrome, no field is cut off (screenshot in the PR; manual, see Assumption 8).
- [ ] `reviewExportSchema` (Zod) accepts a valid export and rejects a missing `schemaVersion` and an
      unknown sheet; the download button produces JSON that the schema accepts (tests).
- [ ] Without `VITE_CONVEX_URL` the page shows an offline notice and does not crash (test).
- [ ] No change to `package.json` and no hot file in the diff (`git diff --name-only origin/main`
      checked against `.github/hot-files.txt`).
- [ ] `npm run verify` passes. If an e2e browser is missing locally, say so in the PR instead of
      claiming it passed.
