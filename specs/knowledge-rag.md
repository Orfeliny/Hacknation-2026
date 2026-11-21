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

1. **Embeddings**: new `embed(texts: string[]): Promise<number[][]>` on `AIProvider`. `openai-compatible`
   calls `POST {base}/embeddings` (same host/SSRF rules as chat, same guardrail-free path: documents are not
   user prompts, but the text is still pseudonymised for personal data if any, see Privacy). `mock` returns a
   deterministic vector from a token hash, so retrieval is approximate but works offline and in tests.
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

Documents are legal or internal regulations, not personal data, but uploads are free-form: the preview warns,
and chunks are never sent anywhere except the configured embedding provider (the same provider rules as chat).
No keys in `VITE_*`.

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
