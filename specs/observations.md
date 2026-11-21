# Observation journal (#13)

Issue: #13 · Branch: `feat/13-observations` · Status: implemented (backend; the UI is built separately)

## Goal

A supervisor writes short, dated notes about how an employee does the job during the 24-month
period, so the review does not rest on the last three months. AI modules (#14, #15, #16) read them.

## Decisions

- D1 (team decision D11, issue comments): the author and HR read an observation; the employee
  never does (an `employee` role gets an error); the next evaluator only after the author's
  consent recorded in `observations.handover`.
- D2: only the employee's current supervisor adds observations. Text is required, 1-1000
  characters, validated with Zod; the UI hint says to describe how the job is done, not private
  matters (interviews: "to ma być aplikacja do ocen okresowych").
- D3: `listForReview` is an internal query without access checks, for AI modules running inside
  the backend; it returns every observation of the given period, including ones marked `wellbeing`; the AI module decides what it sends to a model (#28).

## Acceptance criteria

- [ ] Adding needs at most three inputs (date, text, sentiment); empty or too long text is rejected by Zod.
- [ ] The timeline filters by criterion and date range.
- [ ] Coverage lists the review's criteria without any observation in the current period.
- [ ] The employee role gets an error; HR reads all observations (tests).
- [ ] A handed-over observation is visible to the next evaluator only after the author's consent (test).
- [ ] `listForReview(employeeId, from, to)` is ready for the AI modules.
- [ ] Demo observations from the interview examples; `npm run verify` green.
