# Knowledge base search and answers (RAG-3, #114)

Design: `specs/knowledge-rag.md`. Contract: `convex/lib/contracts/knowledgeDocs.ts` (`ask`).

## Scope

`knowledge/assistant:ask` answers a question from the published documents and cites them, or says nothing
supports an answer (`answer: null`, the page shows "Nie znalazłem tego w bazie wiedzy"). The search is also an
internal action, `knowledge/search:searchKnowledge`, for #14 and #15. No frontend, no shared file.

## Flow

1. Validate the question (1 to `KNOWLEDGE_LIMITS.question` characters, `ConvexError({code:"invalid"})`).
2. The asker's unit comes from the demo persona (`askerContext`); every role may ask.
3. Embed the question, run one `vectorSearch` per scope (`national`, `office`, the asker's unit; a vector
   filter takes one condition), keep hits at or above `SCORE_THRESHOLD`, reload them without the embedding and
   drop anything not active, not `indexed` or not published, best first, at most `MAX_HITS`.
4. No hit: return `answer: null` and do not call the model.
5. Otherwise `generateStructuredOutput` with the shared guardrails (documents are wrapped as data). The model
   names sources by label (`S1`...); labels it did not issue are dropped; no valid label or `found: false`
   gives `answer: null`.
6. `possibleConflict` when a national and an office or unit hit are both present: the note "zweryfikuj
   ręcznie" is appended and the best hit of each kind is cited. It is a rule on the scopes, not a judgement.
7. Every model call is written to the AI register (`knowledge.ask`). Provider failures are `ConvexError` with a
   `code` and a Polish `message`.

## Limits

- `SCORE_THRESHOLD` 0.55 was measured on 16 hand-written questions; tune it on the real corpus (RAG-6, #121).
- Search takes 40 candidates per scope and filters inactive chunks afterwards, so many old versions can crowd
  the result; fine at the size of the starter set.
- The question is sent to the model as typed: names in it are not pseudonymised.
- With the `mock` provider the answer is the opening of the best source and the retrieval is lexical.

## Acceptance criteria (from #114)

- [x] cites fragments; no hit gives `null` without a model call (test)
- [x] a citation outside the results is dropped (test)
- [x] withdrawn, unpublished and inactive documents are not searched (test)
- [x] a unit document is not shown to another unit (test)
- [x] `law` for national, `office` for office and unit (tests)
- [x] possible conflict is flagged (test)
- [x] an injection phrase inside a document does not reach the model as an instruction (test)
- [x] embedding provider failure is a typed error (test)
- [x] every model call is registered (test)
- [x] search available as an internal action (test)
- [x] `npx convex codegen` and `npm run codegen:check`
- [ ] `npm run verify` (all steps except `test:e2e`, which cannot run locally)
