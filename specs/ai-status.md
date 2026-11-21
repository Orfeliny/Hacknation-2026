# Active AI model badge (#27)

Issue: #27 · Branch: `feat/27-ai-status` · Status: IN PROGRESS

## Goal

The jury and the user see which AI model processes employee data and whether that data stays in the office
network ("sovereign AI mode"). The page is read-only: the provider is chosen only by the Convex env.

## Scope

- In: `convex/aiStatus/**`, `src/features/ai-status/**`, this spec, and the generated API typings.
- Out: a provider switcher (the repo rule: only `npx convex env set` chooses it), changes to `convex/ai/**`
  and to other modules (putting the badge on their pages is one line each, left to them).

## Decisions

- D1: `aiStatus.queries.status` reads the same env as the AI actions (`parseAIConfig`) and returns one of
  `mock`, `local`, `external` or `invalid`, with the provider, the model and the host (`host:port`, never the
  path, query, user info or key).
- D2: `local` means the host never resolves on the public internet: loopback, RFC 1918 addresses, a single-label
  name, `.local` or `.internal`. This is the rule `AI_ALLOW_PRIVATE_HTTP` uses in `convex/ai/config.ts`; that
  function is not exported (hot file), so `classifyHost` repeats it and a test compares the two on a list of hosts.
- D3: the label says the state is recognised by the address. A name that looks local but is a proxy to the
  internet would still show `local`; the page says so.
- D4: an `invalid` configuration shows the safe message from `parseAIConfig` (it never contains values) and no
  state of residency.
- D5: no actor argument: provider, model and host are not secrets, and the badge is shown to every role.
- D6: route `/model-ai`, menu label "Model AI", order 80. `AiBadge` is exported for other AI pages.

## Acceptance criteria

- [ ] The badge shows the three states: mock, local, external (tested via host classification).
- [ ] The query never returns an API key or a full URL with a path (test).
- [ ] The UI has no provider switcher.
- [ ] Tests pass and `npm run verify` is green.
