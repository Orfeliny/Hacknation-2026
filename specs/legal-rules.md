# Legal rules as versioned data (#10)

Issue: #10 · Branch: `feat/10-legal-rules` (based on the contract PR #43) · Status: implemented

## Goal

One place for the rules of the periodic review, as data plus pure functions, so a change in the
law is an edit of one versioned pack, not a hunt through components.

## Scope

- In: `convex/rules/` (except the contract file `types.ts`): the 2016 rules pack, sheet choice,
  criteria, rating scale and overall result, deadline arithmetic, deadlines of every stage, and
  `validateReview` with formal gaps in Polish. Every rule carries its legal source.
- Out: UI, queries and mutations (#12, #17 use these functions), the next amendment's pack.

## Sources

Rozporządzenie PRM z 4.04.2016 (Dz.U. poz. 470) § 2-§ 12 and annex 1; ustawa o służbie cywilnej
(Dz.U. 2026 poz. 590) art. 81, 83, 89; `docs/materialy_md/06-materialy-dodatkowe/liczenie-terminow.md`;
sheet field schemas in `docs/materialy_md/04-formularze/`.

## Decisions

- D1: the active pack is `RULES_2016` (`version: "2016-04-23"`, the day the regulation took effect).
  Every function takes the pack as an optional argument, so a test or a future pack can change a
  constant (e.g. the 24-month period) without touching code.
- D2: deadlines are `YYYY-MM-DD` strings. Month terms end on the matching day, or on the last day
  of a shorter month; day terms do not count the day of the event; a term ending on a Saturday,
  Sunday or public holiday moves to the next working day (Kodeks cywilny art. 111-115, as in the
  KPRM note on counting terms).
- D3: justified absences that follow each other, separated only by days off, form one continuous
  absence. One longer than a month extends the review due date by its length (art. 81 ust. 7).
- D4: public holidays are computed (fixed dates, Easter-based dates, 24 December from 2025).

## Acceptance criteria

- [ ] `pickSheet` returns A, B or C for each `positionKind` (§ 3).
- [ ] More than 3 additional criteria, a duplicate or a mandatory one chosen as additional is an error.
- [ ] `computeAssessment` follows § 11: levels from the average, negative for any 1-point rating.
- [ ] `computeDeadlines` returns every stage deadline; tests on month ends, weekends, holidays and
      absence continuity, including the examples from the KPRM note.
- [ ] `validateReview` reports at least: missing sheet, missing criteria, missing rating, missing
      signature, overdue term, missing justification of a negative, missing IPRZ conclusions.
- [ ] Every rule has a `source`; changing the review period is one constant (test).
- [ ] `npm run verify` green.
