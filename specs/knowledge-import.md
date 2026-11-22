# Import and parsing of knowledge documents (RAG-1, #112)

## Scope

HR (roles `hr`, `admin`) imports a document from a file, a link or an ELI act. The server parses it to
Markdown and keeps a capped preview on the row. Chunking, embeddings, publish, withdraw and remove
are RAG-2 and stay stubs. No frontend panel, no new dependencies, no shared files.

## Flow

1. `register` / `registerUrl` validate with Zod, insert a `queued` row, schedule `parse.parseDocument`,
   write an audit entry (ids only).
2. `parseDocument` ("use node") claims the row (`queued` → `indexing`), reads the stored file or
   downloads the link, converts it, stores `markdown` (capped at `previewChars`) and `contentHash`.
3. Errors: unusable content (scan, empty text, unsupported type behind a link) → `needs_fix`;
   a failed download or a broken file → `failed`. Both set a readable Polish `error`.
4. The row stays `indexing`; RAG-2 takes it to `indexed`.

## Rules

- Access: only `hr`/`admin` with a resolved employee, otherwise `ConvexError({code:"denied"})`.
- Files: PDF, DOCX, HTML, Markdown, at most 20 MiB; `.doc` → "zapisz dokument jako DOCX".
- Links: https only, no credentials, port 443, no private or internal host. Redirects and DNS
  results are re-checked on every hop; download cap 8 MiB (acts reach ~2.5 MB of HTML).
- ELI links (`eli.gov.pl`) are fetched as `/api/acts/<type>/<year>/<pos>/text.html` and keep `eliId`.
- `list` and `getPreview` never return `embedding`.

## Acceptance criteria

See issue #112 (1-10). Not verifiable offline: the cloud deploy of the "use node" bundle (7) and the
measurement on a real ~2.5 MB act (8); real PDF/DOCX parsing is covered by manual checks.
