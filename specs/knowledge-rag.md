# Knowledge base (RAG) — national and per-office documents

Issue: #86 (extends #20, soft: #41, #39). Status: DRAFT, needs the team's OK before any contract PR.

## Goal

HR staff import legal and internal documents (PDF, DOC/DOCX, HTML, Markdown, or a link, e.g. eli.gov.pl).
The system fetches and parses each into Markdown, splits it into chunks, embeds them and stores them in
Convex. The assistant (#20, and optionally the drafting of #15) answers only from active chunks and always
cites them, or says "Nie znalazłem tego w bazie wiedzy". Stay on Convex: no Postgres, no extra database.

## Verified so far (spike, 2026-11-21)

- `vectorIndex` + `ctx.vectorSearch` with a `filter` on a field works on the local open-source Convex backend
  (anonymous mode): the index deploys, the search returns ranked results, the filter is applied.
- Verified the same on the pinned self-hosted image from `docker-compose.yml` (precompiled-2026-11-20): the
  8-dimension vector index deployed with a filter field, and the filtered `vectorSearch` returned ranked results.
  Not yet tried at 1024 dimensions or with real volumes; check scale in the backend PR.
- Convex limits to design around (check against current docs before the contract PR): vector search runs
  only in actions; a document is at most 1 MiB; at most 4096 dimensions; at most 256 results per search.

## Decisions

1. **Embeddings**: new `embed({ texts })` on `AIProvider` (in the contract PR, `convex/ai/**`): 1 to 64
   non-empty texts of at most 8000 characters per call, one 1024-dimension vector each. `openai-compatible`
   calls `POST {base}/embeddings` (same host, SSRF and retry rules as chat). Embedding input is sent as is:
   guardrails do not wrap, neutralise or pseudonymise it, because a document is not a prompt and a rewritten
   chunk would no longer match its stored text. `mock` returns a deterministic vector from hashed words, so
   retrieval is approximate but works offline and in tests.
2. **Embedding model: `bge-m3`, 1024 dimensions, fixed** (a `vectorIndex` has a fixed size). Chosen by the
   task owner on 2026-11-22: multilingual, long context, open license, runs on Ollama on-prem and anywhere an
   OpenAI-compatible `/embeddings` endpoint serves it. Retrieval quality on Polish acts is not measured yet:
   check it with a small question set (is the right article in the top 3) in the backend PR. Changing the model
   later means re-embedding everything; store `embeddingModel` per document to detect it.
3. **Parsing to Markdown happens on the server**, in a `"use node"` action, from a Convex storage blob or a
   fetched URL. New dependencies (an HTML→Markdown converter, a PDF text extractor, a DOCX converter, a legacy
   `.doc` reader) are vetted and added in the contract PR, never in a feature branch (CLAUDE.md). Candidates,
   not yet vetted for license, maintenance and size: `turndown` or `node-html-markdown`, `unpdf`, `mammoth`,
   `word-extractor`. If `.doc` has no acceptable library, reject it with "zapisz jako DOCX" and say so.
4. **Scanned PDFs** (no text layer): rejected as "do poprawy" with a clear message; no OCR in the first version.
5. **eli.gov.pl**: use the official ELI API when the link matches an act (keeps `eliId`, title, dates as
   metadata), otherwise generic HTML fetch.
6. **Scope** follows the merged B4 contract (#89, `convex/lib/contracts/knowledgeDocs.ts`): `office` (the whole
   office) and `unit` (one organisational unit, cited only to that unit). We add `national` (all offices) as a
   third value, cited as kind `law`. Search filters to `national` + `office` + the caller's `unit`. There is no
   separate `institutionId`: one deployment is one office.
7. **Versions**: a document has a `sourceKey` (normalised URL or ELI id or file hash of the title+scope). Re-importing
   the same content hash is a no-op ("już zaimportowano"). New content under the same `sourceKey` creates version
   n+1 as `pending`; publishing it marks the previous version's chunks inactive in one batched mutation. Rollback
   re-activates the previous version. Only active chunks are searchable (`active` is a vector filter field).
8. **Citations and "I don't know"**: the answer step returns the cited chunk ids. No chunk above a score
   threshold (configurable constant, tuned on the fixtures) means a fixed "Nie znalazłem tego w bazie wiedzy"
   message and no model call. The model never invents requirements or rating levels (shared guardrails #28).
9. **Conflicts**: when hits from the national and the office or unit scope are both above the threshold, the answer
   lists both and marks "możliwy konflikt, zweryfikuj ręcznie". It is a rule on scopes, not an AI judgement.
10. **Access**: HR and administrator import, preview, publish, withdraw. Everyone with a role reads answers.
    Refusals are `ConvexError({code:"denied", message})`. Every import/publish/withdraw writes an audit entry (#39).

## Data and the B4 contract merged in #89 (contract PR; `convex/knowledge/tables.ts` is a hot file)

#89 already added `knowledgeDocuments`, the `by_document` index, `documentId` on `knowledgeChunks`, stubs in
`convex/knowledge/{documents,assistant}.ts` and `convex/lib/contracts/knowledgeDocs.ts`. The table is empty and
nothing writes to it. We keep its public API (`list`, `generateUploadUrl`, `register`, `remove`, `ask`) so the B4
frontend (`src/lib/backend/knowledgeDocs.ts`) keeps working. The contract PR changes it only like this:

- `scope`: add `national` to `office|unit` (a new union member).
- `status`: keep `queued|indexing|indexed|failed` (= oczekuje, przetwarzanie, gotowe, błąd) and add `needs_fix`
  (do poprawy) and `withdrawn` (wycofany). The frontend maps them to Polish labels.
- `storageId` becomes optional (URL imports have no file); add `registerUrl` next to `register`.
- New optional fields on `knowledgeDocuments`: `description`, `sourceKind` (`file|url`), `sourceUrl`, `sourceKey`,
  `contentHash`, `version`, `supersedesId`, `checklist` (validity scope, legal basis, effective date, publication
  date, Polish language, publication consent), `eliId`, `embeddingModel`, `markdown` (preview, capped),
  `publishedAt`. New indexes by `sourceKey` and by `status`.
- `knowledgeChunks`: optional `scope`, `unit`, `active`, `embedding` (`float64[1024]`) and
  `vectorIndex("by_embedding", filterFields: scope, unit, active)`. `by_document`, `search_text` and existing
  rows stay valid.
- Everything above adds a field, an index or a union member, or loosens `storageId`; `askContract` and the row
  shape stay compatible (`KnowledgeDocumentRow` gains optional fields). If the team prefers a full replacement of
  the #89 shape instead, the table is empty, so it is cheap, but it breaks "additive only" and needs their OK.

## Pipeline

1. `createFromFile` / `createFromUrl` (mutation) validates type, size (cap in a constant), URL (https only,
   no private hosts, redirects re-checked) and the checklist; stores a `oczekuje` document.
2. `process` (internal action, scheduled): fetch or read the blob, parse to Markdown, reject empty or garbled
   text (`do_poprawy`), chunk by headings with a size cap and a heading-path `locator`, embed in batches,
   store chunks inactive. Failure sets `blad` with a readable message; the form stays usable.
3. `preview` query shows the parsed Markdown and metadata; HR can discard.
4. `publish` / `withdraw` mutations switch `active` in batches and write the audit entry.
5. `ask` action: embed the query, `vectorSearch` per scope with `active`, apply the threshold, build the answer
   from cited chunks only, call `recordAiInteraction` (#39).

## Parsing spike results (2026-11-22, throwaway project outside the repo)

Libraries run in a Convex `"use node"` action on the local open-source backend; versions are pinned exactly.

| Format      | Library                  | Result                                                                                                                                  |
| ----------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| HTML (ELI)  | `turndown@7.2.5` (MIT)   | 107 KB / 0.94 MB / 2.4 MB acts convert in 32 / 106 / 256 ms; fetch 0.1-0.5 s; process RSS 105-189 MB. Text and links kept.              |
| HTML (ELI)  | `node-html-markdown@2`   | Same output size but 10x slower on 2.4 MB (2.3 s) and builds a broken table; not chosen.                                                |
| PDF         | `unpdf@2.2.1` (MIT)      | ELI PDF, 19 pages, 41.7k chars in 310 ms; Polish diacritics intact; flat text, no headings (`§ 1.` stays on its own line).              |
| DOCX        | `mammoth@1.13.0` (BSD-2) | Heading, paragraph, Polish text and table survive to HTML; turndown then drops table structure (needs a GFM table rule).                |
| DOC         | `word-extractor@1.0.4`   | Not tested; last release 2022-06. Treat as unmaintained: reject `.doc` with "zapisz jako DOCX" unless the team wants to risk it.        |
| gov.pl page | `turndown`               | `ocena-okresowa` 29 KB to 11.9k chars, `oceny-pracownicze` 50 KB to 32.6k chars; navigation boilerplate not yet stripped (not checked). |

Findings that shape the backend:

- A 2.4 MB act converts in well under a second, so parsing fits one action; only chunking and embedding need batches.
- ELI marks `§` and every numbered paragraph as headings, so chunking by heading gives tiny pieces. Chunk by `§` (or
  article) and merge its paragraphs, with the heading path (act, part, `§`) as the `locator`.
- The ELI annexes (rating-sheet templates) have malformed table markup; text order is kept but table structure is lost.
  Acceptable for retrieval; the preview should not promise tables.
- ELI titles lose spaces between spans (`Ministrówz dnia`); normalise whitespace when building the title.
- Scanned PDF detection (near-empty pages) is planned but only a text PDF was tested; verify on a real scan.
- Not tested: a real DOCX from Word (only a hand-built one), a scanned PDF, `bge-m3` retrieval quality (needs the model
  pulled, about 1.2 GB; ask first).
- New dependencies for the contract PR: `turndown`, `unpdf`, `mammoth` (plus `turndown-plugin-gfm` if tables matter).
  Licenses MIT/MIT/BSD-2. Not yet checked: bundle size on the deployed Convex, since `"use node"` actions have their own
  limits; the spike ran locally only.

## Retrieval spike with `bge-m3` (2026-11-22)

Ollama (the image pinned in `docker-compose.yml`) served `bge-m3` on CPU. Corpus: three acts parsed with `turndown`
(the service-civil-service act, the 2016 regulation on periodic ratings, the Labour Code as a distractor), cut by
article or `§`, split at 1200 characters with the act and article as a prefix: 787 chunks, 1024 dimensions, cosine.

- 16 questions about periodic ratings whose right article was chosen by the author from the text: right article at
  rank 1 in 13, in the top 3 in 15, a miss in 1 (the deadline for telling the person rated about the criteria).
- 3 off-topic questions (VAT, a recipe, a football result) scored at most 0.48, while right answers scored 0.63-0.77.
  A threshold near 0.55 separates them on this set; tune it again on the real corpus.
- Cost: embedding 787 chunks (557k characters) took about 5 min on CPU, roughly 0.4 s per chunk. A large act
  (about 300 chunks) is about 2 min, so embedding must run in batches from scheduled actions, never in one call.
- Limits of this check: 16 hand-written questions, one author, one distractor act, no query that needs two articles,
  no reranker. It supports choosing `bge-m3`; it is not a quality guarantee.

## Measurement on the real corpus (RAG-6, 2026-11-22)

Local Convex, `bge-m3` on Ollama (CPU), the 16 usable sources of the starter set (3092 chunks; the visa
regulation has no text), `scripts/knowledge-eval.mjs` over `scripts/knowledge-eval-questions.json`. The first
measurement used 40 questions (29 with a source, 8 off-topic, 3 national-versus-office conflicts that need an
office document); the set was then rewritten to 47 questions about the content of the 17 sources (43 with a
source, 4 control questions) and the tables below say which set they use. "Right act" means the expected act is among the hits; hits are asked for with the cut-off at 0.

| Chunker                                  | Act at rank 1 | Act in the top 3 |
| ---------------------------------------- | ------------- | ---------------- |
| before the fix of #157 (articles lost)   | 11/29 (38%)   | 17/29 (59%)      |
| after the fix (article kept in locators) | 17/29 (59%)   | 22/29 (76%)      |
| 47-question set (43 with a source)       | 21/43 (49%)   | 28/43 (65%)      |

The 47-question set is harder (acts outside the topic of appraisals: prosecution, tax administration, bonds, higher
education). Three changes were tried on it and dropped or kept by a sample of 10 sources (32 questions): the act
name instead of the Dz.U. address in the embedded prefix (50%/69% against 53%/72% with the address, no gain, dropped),
a limit of 3 hits per document (no effect on rank, kept) and removal of ELI footnotes (kept, removes `[3)](#gloss)`
noise). Full-corpus result after them is the 47-question row. Threshold counts on this set: 0.30: 16 right, 14 wrong,
8 refused; 0.35: 14, 7, 11; 0.40: 11, 5, 15; the control questions reach 0.41 at most.

Right sources score about 0.3-0.5, off-topic questions up to 0.49 (a football question scored 0.49), so no cut-off
separates them. Counts per threshold, after the fix:

| Threshold | Answered right | Answered wrong | Right act refused | Off-topic refused | Off-topic answered |
| --------- | -------------- | -------------- | ----------------- | ----------------- | ------------------ |
| 0.25      | 15             | 12             | 2                 | 0/8               | 8                  |
| 0.30      | 13             | 9              | 5                 | 1/8               | 7                  |
| 0.35      | 11             | 6              | 8                 | 5/8               | 3                  |
| 0.40      | 9              | 4              | 11                | 7/8               | 1                  |
| 0.45      | 6              | 3              | 14                | 7/8               | 1                  |
| 0.50      | 4              | 2              | 16                | 8/8               | 0                  |
| 0.55      | 1              | 0              | 21                | 8/8               | 0                  |

Decision: `SCORE_THRESHOLD` goes from 0.55 (from the spike; it let one question through) to **0.35**. It keeps most
right answers and sends 3 of 8 off-topic questions to the model, whose `found: false` is the second line of
defence. Higher values refuse most legitimate questions.

What the measurement does not show:

- The answer step was not measured (no chat model here): whether the model refuses the off-topic questions that
  pass 0.35 is open. Re-measure with the real chat model before the demo.
- The article is right in the top 6 for only 3 of 10 questions that name one, although the act is usually right:
  retrieval finds the act more reliably than the exact provision.
- 40 questions by one author (the issue asks for more than one); the conflict questions are skipped until an
  office document is loaded (`--office`).
- Scores are not comparable with the spike (0.63-0.77): chunks are longer and carry a path prefix. Redo the
  measurement after any change to the chunker or the embedding model.
- Hybrid search (vectors plus the existing full-text index) and a reranker are not justified yet by this data, but the
  weak article-level recall is where they would help first.

## Starter set of national sources (from the team's lists in #86)

Seed, scope `national`, imported through the same pipeline (a script or an HR action, not hard-coded rows).
ELI acts, `https://eli.gov.pl/api/acts/DU/<year>/<pos>/text.html`: 2008/1505, 2016/470, 2008/1458, 1982/214,
1998/1125, 2007/1749, 2001/1070, 2012/714, 2016/177, 2016/1947, 2018/483, 2018/1668, 1982/19, 2022/1822, 1974/141.
Pages: `https://www.gov.pl/web/sluzbacywilna/ocena-okresowa` and `.../oceny-pracownicze` (not yet fetched).
The team's list for KPRM and the list of national acts overlap; which acts are KPRM-only is not stated.

Measured on three of them: plain `text/html`, no login, 107 KB (DU/2016/470), about 0.95 MB (DU/1974/141) and
about 2.5 MB (DU/2008/1505). So: the fetch limit must allow several MB, a document's full Markdown does not fit
one Convex record (1 MiB), so only a capped preview is stored on `knowledgeDocuments` and the text lives in chunks;
processing runs in steps (parse, then chunk and embed in batches via scheduled actions), not in one call.

## Privacy

Documents are legal or internal regulations, not personal data, but uploads are free-form: the preview warns
HR before publishing, and chunk text goes only to the configured embedding provider (the same provider rules as
chat) and is not pseudonymised on the way (see decision 1). Text that reaches the answer step is different:
chunks fed into `ask` go through `generateText` or `generateStructuredOutput`, so the shared guardrails (#28)
wrap them and a document containing an injection phrase cannot steer the model. No keys in `VITE_*`.

Backend rules that follow from review of the contract PR:

- Publishing a version clears `publishedAt` on the previous version's row (its status stays `indexed`), so one
  version per source is published. A complete checklist means every text field is non-empty and
  `polishLanguage` and `publicationConsent` are true; the backend validates link, size, checklist text and dates
  with Zod at the boundary (the Convex validators only check types).
- `knowledgeChunks.embedding` is 8 KB per row: list and detail queries must not return it to clients.
- A vector filter supports `eq` and `or`; `unit` is unset on national and office chunks, so search runs once per
  scope (national, office, the caller's unit) and merges the results.

## Acceptance criteria (from #86, made testable)

- [x] Spike: `vectorIndex` + filtered `vectorSearch` works on the self-hosted Docker backend (8 dimensions).
- [ ] HR can create a document from a file or a URL with the checklist and sees a parsed preview before publishing.
- [ ] PDF (text layer), DOCX, HTML, Markdown parse to Markdown; `.doc` either parses or is rejected with a clear message.
- [ ] An eli.gov.pl link keeps its link and metadata.
- [ ] National, office and unit documents are indexed and searched separately.
- [ ] Re-importing the same source does not duplicate; a changed source creates a new version; rollback works.
- [ ] Wrong type, empty document, duplicate, fetch failure and private-host URL each give a readable message.
- [ ] Search uses only active chunks and cites the fragment; no hit above the threshold gives the "not found" message.
- [ ] Tests: national doc, office doc, unit doc, version conflict, no source, double URL import; `mock` provider, no network.
- [ ] `npm run verify` green (`test:e2e` in CI).

## Split into PRs

1. **Spike + contract** (hot files): Docker spike result, vetted dependencies, `AIProvider.embed`, additive tables
   and `vectorIndex`. Agree with the team first.
2. **Backend** `convex/knowledge/**`: documents, parsing, chunking, import, publish/withdraw, tests.
3. **Search** `ask` with citations, threshold, conflict flag; hooks for #20 and #15.
4. **Panel** `src/features/knowledge/**`: list, form with checklist, preview, statuses, withdraw.

## Out of scope

OCR, automatic refresh of sources (see #41), hybrid vector + full-text ranking, per-user document permissions.
