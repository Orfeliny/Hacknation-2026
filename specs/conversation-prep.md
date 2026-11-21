# AI preparation for conversations (#14)

Issue: #14 · Branch: `feat/14-conversation-prep` · Status: implemented (backend; the UI and the
"rozmowa oceniająca" mode are built separately)

## Goal

Help the evaluator prepare the opening, the evaluation and an ongoing feedback conversation: goal,
agenda, questions per criterion, communication tips and a difficult scenario. The opening plan
also suggests up to 3 additional criteria with a reason (§ 5 ust. 2).

## Decisions

- D1: AI suggests, never rates (KPRM interviews). The system prompt forbids ratings, and only
  catalogue criteria that are not mandatory survive as suggestions; they are returned, not stored.
- D2: before a prompt leaves the backend, the employee's names (shared pseudonymizer from #28, with
  Polish case endings), PESEL numbers and e-mails become placeholders; notes go between `<dane>`
  markers as material, not instructions. Every call is logged in `aiInteractions` (#39).
- D3: the prompt uses only observations the author may read (D11) from the current period.
- D4: every kind has a `mockFixture`, so `AI_PROVIDER=mock` works offline; an AI failure returns a
  typed message and the plan can still be written by hand (`savePlan`).
- D5: a plan is the evaluator's working material: the author and HR read it, the employee does not.

## Acceptance criteria

- [ ] Each of the 3 kinds yields a plan with a goal, questions and tips, in `mock` mode without a key.
- [ ] The built prompt has no identifying data of the employee (test).
- [ ] An AI error shows a message and the plan can still be written by hand.
- [ ] The plan and the outcomes are stored with the conversation.
- [ ] Tests with no network; `npm run verify` green.
