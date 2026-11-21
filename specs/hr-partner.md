# Virtual HR partner (#16)

Status: IMPLEMENTED, see the PR for #16 · Issue: #16 · Branch: `feat/16-hr-partner`

## Goal

Help a supervisor manage people beyond the review itself: spot wellbeing, overload and recognition
signals in their team, get concrete supportive actions for each signal, and ask the HR partner about
a situation. Signals come from explainable rules; the model only suggests actions and never decides
anything about a person's rating. This is the module the challenge scores separately (section 3.3).

## Scope

- In: a rule engine (6 signal kinds), supervisor queries and mutations, AI actions `recommend` and
  `ask` with `mockFixture`, an aggregated view for HR, the page `/hr-partner`, a demo seed.
- Out: writing observations (#13); reminders and mail for recognition (#17); the real guardrails and
  pseudonymisation helper (#28); letting the model read observation text.

## Assumptions

1. **Six kinds, all in the contract** (`hrSignals.kind`): `workload`, `no_recognition`,
   `duties_change`, `long_absence`, `supervisor_change`, `recognition_moment`. The issue asks for
   four; the rest are cheap because the data already exists.
2. **Signals are computed, not stored.** A row in `hrSignals` exists only once the supervisor
   handled a signal or asked for recommendations. A computed signal is matched to its row by
   `(employeeId, kind, reason)`. The `reason` text embeds the evidence (counts and dates), so when the
   evidence changes the reason changes and a dismissed signal can come back as a new one.
3. **Rules and constants** (`convex/hrPartner/rules.ts`, days unless noted):
   `workload`: 3 observations tagged `wellbeing` within 42 days; `no_recognition`: the employee has
   observations but no positive one for 90 days; `duties_change`: a `duties_change` staffing event
   started within 180 days; `long_absence`: an absence (consecutive periods merged, `rules/dates.ts`)
   that ended within 60 days or is still running; `supervisor_change`: an `evaluator_change` event
   within 180 days; `recognition_moment`: a positive observation 3 to 30 days old that no one acted on
   (acting = marking the signal `acted`).
4. **Who sees what.** Whoever is the employee's supervisor (`employees.supervisorId`), in any role
   except `employee` and `hr`, sees that employee's signals and recommendations. HR sees only counts
   per kind (no names, no reasons, no observation text), as the issue says; a group of one is
   still shown, so HR could infer who it concerns from its own staffing data (known limit). The
   employee role gets an error. Nobody sees signals about themselves.
5. **Data minimisation toward the model.** The prompt carries structured facts only (signal kind,
   reason, counts, dates, criterion names), never observation free text, and the employee's name is
   replaced by `[PRACOWNIK]`. Until #28 lands, `convex/hrPartner/pseudonymize.ts` does the replacement;
   switching to the #28 helper later is a one-file change. A signal is a hint, not a diagnosis, and the
   UI says so.
6. **Observations follow D11.** Signals and the facts sent to the model are built only from the
   observations the viewer may read: the supervisor's own, and those handed over to them by the
   author. A new supervisor therefore starts without the previous one's notes. HR counts all of them.
7. **Refusals are `ConvexError`** (`code: "denied"`): Convex hides the text of a plain `Error` from
   the client in production. Actions and the page read the message from the error data.
8. **Free text is neutralised.** Angle brackets are removed from the question before it goes inside
   the `<dane>` block, so it cannot close the block. The placeholders are indexed
   (`[PRACOWNIK]`, `[PRACOWNIK_2]`, ...) so an answer about two people maps back correctly.
9. **No rating advice.** The system prompt forbids naming a rating level; #28 will enforce it on
   the output for every module.
10. Time is passed in (`now`), so rules are tested without a clock. The page reads the real clock and does not refresh at
    midnight by itself.

## Tasks

1. Rules (files: `convex/hrPartner/rules.ts`, `rules.test.ts`): pure `computeSignals(input, today)`.
2. Backend (files: `convex/hrPartner/{access,queries,mutations,seed}.ts`, tests, `convex/_generated/**`):
   `listForSupervisor`, `hrSummary`, `setStatus`, internal context query and `saveRecommendations`.
3. AI (files: `convex/hrPartner/{actions,pseudonymize,prompts}.ts`, tests): `recommend`, `ask`.
4. Page (files: `src/features/hr-partner/**`): team signals, recommendations, chat, HR summary.
5. Review by a separate agent, `npm run verify`, PR.

## Acceptance criteria

- [x] At least four signal kinds are computed, each with a readable reason and a rule test; all six
      are implemented.
- [x] Threshold boundaries are tested: workload at 2 and 3 observations and at 42 and 43 days;
      no_recognition at 90 and 91 days.
- [x] A recognition moment appears after 3 days and disappears once marked `acted`; a dismissed signal
      stays hidden until its evidence (and so its reason) changes.
- [x] Access (convex-test): the supervisor of the employee sees the signals; another supervisor sees
      none; HR gets counts only; the employee role is refused.
- [x] `recommend` returns at least 3 concrete actions in `mock` mode and stores them in `hrSignals`.
- [x] The prompt sent to the model contains no employee name and no observation text (test on a stub
      provider that captures the prompt).
- [x] A provider error returns a typed error; the signal list keeps working.
- [x] `ask` accepts at most 1000 characters, answers in `mock` mode and returns typed errors.
- [x] The demo seed gives at least one employee with a workload signal for the demo supervisor.
- [x] The page shows that signals are hints, lists signals with their reason, and works offline with a
      notice (component tests).
- [x] The reason of a signal does not change while days pass: after a dismiss, sliding the workload
      window by 3 days keeps it hidden (rules test).
- [x] A supervisor does not see signals or facts built from another author's observations until they
      are handed over; HR counts them (convex-test).
- [x] A question cannot close the `<dane>` block, and two people in one question map to their own
      names in the answer (action tests).
- [x] A refusal reaches the page as its message; any other error shows a fixed text (component tests).
- [x] No change to `package.json` and no hot file in the diff.
- [ ] `npm run verify` passes. `test:e2e` does not run locally (no Playwright browser); CI runs it.

Evidence: `npx vitest run --project frontend --project backend src/features/hr-partner convex/hrPartner`.
