# Chunks, embeddings, versions and publishing (RAG-2, #113)

## Scope

Builds on RAG-1 (`specs/knowledge-import.md`). Parsed Markdown is split into chunks, embedded in batches
and published as the single current version of its source. Search and `ask` are RAG-3.

## Flow

1. `parseDocument` hashes the Markdown. `ingest.saveParsed` compares it with the other rows of the same
   `sourceKey`: same hash as an indexed/indexing row → this row becomes `failed` ("już zaimportowany");
   otherwise `version` = highest + 1 and `supersedesId` points at it.
2. `chunk.ts` cuts by article / `§` (or by headings of level ≤ 3 when there are none), merges numbered
   points into their unit, splits at ~1200 characters. Text = title + heading-path locator + body, capped at
   8000 characters. Chunks are inserted inactive, 100 per mutation, with `scope` and `unit` of the document.
3. `indexing.embedDocument` embeds up to 64 chunks per run through `AIProvider.embed` (no pseudonymization),
   reschedules itself, then sets `indexed` and `indexedAt`. `embeddingModel` is stored on the document.
   A provider error sets `failed` with a readable message; chunks stay inactive.
4. `publish`: only `indexed` with a complete checklist. Sets `publishedAt`, clears it on the previous
   published version, activates the new chunks and deactivates the old ones in batches of 100.
5. `withdraw`: status `withdrawn`; the nearest earlier `indexed` version gets `publishedAt` back and its
   chunks are re-activated. `remove`: same restore, then deletes the stored file, the row and the chunks.
6. Publish, withdraw and remove write an audit entry (`update`, details = step name). HR/admin only.

## Not in this change

Re-embedding after a model change (the stored `embeddingModel` allows detecting it), search, frontend,
index scale tests (#122). A restored version gets a new `publishedAt` (the original is not kept).
