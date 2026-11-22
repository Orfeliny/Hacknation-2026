# Kompas: knowledge assistant chat (RAG-5, #116)

Design: `specs/knowledge-rag.md`. Backend: `specs/knowledge-ask.md` (`knowledge/assistant:ask`, #114).
Contract: `convex/lib/contracts/knowledgeDocs.ts`. Part of #20 (Kompas).

## Scope

A chat page in `src/features/assistant/` that asks `ask` through `useAskKnowledge`. The hook already
calls the backend when `VITE_CONVEX_URL` is set and the demo data otherwise, so no shared file changes.

- Question box and a conversation list (question, answer or the not-found message).
- Every answer lists its citations, office documents apart from national law (`kind`).
- A citation is a button; it opens a source preview with `title`, `locator`, `excerpt` and, when
  `documentId` is known, a link to the document in the HR panel (HR and admin only).
- `answer: null` shows "Nie znalazłem tego w bazie wiedzy." and no citations.
- `possibleConflict` shows a warning to check the sources manually.
- A question that asks for the rating level of a named person is refused in the page, before the call,
  with the explanation that the assistant does not rate people. The backend guardrails stay the second line.
- 10 test questions (2 outside the knowledge base) with expected sources, in `questions.ts`.

Out of scope: backend changes, drafting hints (#15, optional second step), conversation prep (#14).

## Also in this PR (from #112, #113, #115)

- Real act titles and dates in `convex/knowledge/sources.ts`, from the ELI API.
- Assert `scope` and `unit` on chunks: done in #157.

## Acceptance criteria (from #116)

- [x] The page shows an answer with citations or the not-found message (component test).
- [x] Clicking a citation shows the excerpt and locator (component test).
- [x] A possible conflict is visible and asks for manual verification.
- [x] A question about a person's rating level is refused.
- [x] 10 test questions with expected sources; on `mock` the 2 outside questions give "nie wiem".
- [x] `npm run verify` is green.

## Notes

- The 10 questions are checked on the demo backend (`mock`); relevance on the real corpus is RAG-6 (#121).
- Not done: the optional "Podstawa w przepisach" section in the review draft (#15).
- Two items of the team's act list look wrong: DU/2007/1749 is a visa regulation and DU/2018/483 a notice on
  the bonds act. They are still in the starter set until the team decides.
