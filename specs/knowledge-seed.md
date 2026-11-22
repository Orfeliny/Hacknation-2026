# Starter set of the national base (RAG-4, #115)

## Scope

`knowledge/seed:run` registers the 15 ELI acts and 2 gov.pl pages of `sources.ts` through
`documents.registerUrl` as the demo HR account (same validation, audit and version rules as an import by HR).
`seed:publishReady` publishes the seeded documents once they are `indexed`, polling every 60 s for up to 4 h.
Instructions: `docs/knowledge-seed.md`.

## Rules

- Idempotent: a source that is queued, indexing or indexed is skipped; failed or needs-fix ones are retried.
- No keys, no `.env*`. Without an HR account the run returns a message and registers nothing.
- Checklist: full, `polishLanguage` and `publicationConsent` true; dates default to the load day until
  `sources.ts` carries the real ones.
- Web pages: `pageContent` keeps `<main>` and drops `nav`, `header`, `footer` and `aside` (not ELI acts).
- Review of #113 (Igor): `list` counts chunks from the last chunk's `order` instead of reading all of them
  (8 KB embeddings against the 16 MiB read limit); `failStale` fails documents queued or indexing for over six
  hours. It runs on every import and on every seed poll.

## Not verified here

Real fetch of the 17 sources, indexing with a real model, the gov.pl page cleanup on the live pages.
