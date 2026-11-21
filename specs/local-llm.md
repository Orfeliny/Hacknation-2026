# Local Polish model through the OpenAI-compatible adapter (issue #26)

Let an office run Bielik or PLLuM on its own server (Ollama, vLLM) and point the existing
`openai-compatible` adapter at it, without a new dependency or provider.

## Context

- `convex/ai/config.ts` allowed `http://` only for `localhost` and `127.0.0.1`. A model server in the
  office network (`http://llm.urzad.local`) or in Docker (`http://llm:11434`) was rejected.
- Interviews of 21.11 (`docs/wyzwanie/wywiady-2026-11-21.md`, W2 08:03-11:31): a small office cannot
  host a model. A local model is one option, next to a hosted endpoint with pseudonymisation (#28),
  and every AI feature must still work with `mock` or manual editing.

## Scope

Files: `convex/ai/config.ts`, `convex/ai/config.test.ts`, `convex/ai/openaiCompatible.ts`,
`convex/ai/openaiCompatible.test.ts`, `docs/ai-providers.md`, `.env.example`, this spec.

Out of scope: a gateway or worker for reaching a private model from Convex cloud, IPv6 private
ranges, auto-detection of structured-output support, a new provider.

## Design

**Config.** New Convex env `AI_ALLOW_PRIVATE_HTTP` (`true` | `false`, default `false`; any other value
is a `config` error). `AI_BASE_URL` rules:

- `https`: always allowed (no credentials in the URL, as before).
- `http` to `localhost` / `127.0.0.1`: always allowed (unchanged).
- `http` to a private host: allowed only with the flag. A private host is:
  - an IPv4 address in `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (after WHATWG URL
    normalisation, so hex or short forms are judged by their real value);
  - a single-label name (`llm`, `ollama`; Docker service names);
  - a name ending in `.local` (mDNS, RFC 6762) or `.internal` (reserved by ICANN for private use, 2024).
- `http` to any other host: always rejected, with or without the flag.

The error message names the rule and the flag, never the URL or host.

**Adapter.** Ollama and vLLM return the standard chat-completions shape with extra fields; the Zod
schema already ignores unknown keys. Structured output already has `AI_STRUCTURED_MODE`
(`json_schema` / `json_object` / `prompt`) and strips a markdown fence. Added: when the reply is not
JSON, the adapter parses the text from the first `{` to the last `}` once more (a model that ignores
`response_format` and adds a sentence). The result still goes through the Zod schema and guardrails;
no match gives `bad_response` as before.

**Docs** (`docs/ai-providers.md`, Polish): the flag, which hosts count as private, the Convex-in-the-same-
network limitation, full Bielik-on-Ollama setup with `npx convex env set`, Bielik/PLLuM on vLLM, and a
note that a hosted HTTPS endpoint with pseudonymisation is equally valid for small offices.

## Acceptance criteria

- [x] Without the flag `http://llm:11434` is rejected; with it, it passes. A public host over `http` is
      always rejected. Tests in `convex/ai/config.test.ts`.
- [x] Adapter tests with stubbed `fetch` in Ollama and vLLM response formats, including the
      JSON-in-prose fallback.
- [x] Docs show the full Bielik-on-Ollama configuration and do not present a local model as the only way.
- [x] `mock` is still the default; lint, typecheck, unit tests and build pass.
