# Automation-ready: CI/CD, environments, zero morning boilerplate

Status: DRAFT, waiting for team confirmation. Owner: Michal. Deadline: before hackathon start (tomorrow).

## Problem

The starter has CI, a deploy workflow and `setup:deploy`, but nothing is provisioned: no Convex
deployment, no deploy secrets (deploy is skipped), `main` is unprotected, PRs get no preview
environment. On hackathon morning the team would spend the first hours on infrastructure and on
generating boilerplate instead of product code.

## Goal

At hour 0 the team opens a PR and gets a green gate, a preview URL with its own backend, and a
merge to `main` deploys production with no manual step. A new feature starts from a generated
skeleton in one command, so no one (human or agent) writes scaffolding by hand.

## Scope

In:

1. Provision production: Convex prod project + deploy key, Vercel project, the four `production`
   secrets, `main` ruleset with merge queue (via `npm run setup:deploy -- --protect`).
2. Per-PR previews: own Convex preview deployment + Vercel preview URL, URL posted on the PR,
   torn down on close.
3. CI without redundant runs: docs-only changes skip build/e2e, superseded runs are cancelled,
   `gate` stays always-present so required-check logic never hangs.
4. `npm run feature:new <name>`: deterministic scaffold of `src/features/<name>/` and
   `convex/<name>/` (+ test stubs) from the `notes` template. No LLM involved.
5. `npm run doctor`: one-command readiness check (Node 24, gh/convex/vercel logins, secrets
   present, Convex deployment configured, Playwright browsers). Exit code + JSON with `--json`.
6. Docs (Polish) for the new flow; a rehearsed end-to-end drill.
7. Handoff rule for long sessions: when orchestration eats too much context or the session gets
   long, the agent suggests writing `handoff.md` and starting a fresh session with
   "continue from handoff". Rule lives in `CLAUDE.md` (hot file, contract PR); template in
   `docs/handoff-template.md`.

Out:

- Product spec, product features, seed data content (separate spec on the day).
- A persistent staging environment, Docker/GHCR, Sentry setup, custom domain.
- Changing the stack, the AI provider layer or the hot-file rule.
- Real AI provider (Bielik / PLLuM) credentials; `mock` stays the default.

## Constraints

- Hot files: `.github/**`, `package.json`, `vercel.json` change only in one contract PR (task 1),
  with the `Zmiana plików wspólnych` box ticked. Everything else lands in non-hot files after it.
- No new dependency without `oss-first` vetting; prefer zero. Scripts are Node `.mjs`, cross-OS.
- Secrets never in args, logs or files; Convex preview key must be Preview-scoped, never the prod key.
- Free plans only. Public repo in the `Orfeliny` org supports environments, rulesets, merge queue.
- Time box: everything done and drilled today; anything not done by then is cut, not rushed.

## Assumptions (correct me)

- A1. VERIFIED (task 0, 2026-11-20, docs.convex.dev + convex.dev/pricing): preview deployments
  are included on Free & Starter (beta). They auto-expire after 5 days there (14 on Pro), which
  satisfies AC2 without a teardown job. Every preview counts toward the team's deployment limit
  (40 on Free), so the preview workflow uses `--preview-name=<branch>` (reuses one deployment per
  branch) rather than `--preview-create` (recreates on every push).
- A2. Vercel deploys from Actions via CLI work for an org repo on Hobby. The docs flag this as
  unverified; the drill (task 7) proves or disproves it.
- A3. "No redundant generations" means no boilerplate generated on the day, not caching AI calls.
- A4. Michal owns the Convex, Vercel and Sentry-less accounts and can paste the Vercel token.
- A5. One production deployment is enough for the demo; `mock` provider is set on it.

## Acceptance criteria

1. WHEN a PR from the same repo is opened THEN CI SHALL run `gate` and a preview URL SHALL appear as a PR comment within 10 minutes. The preview runs in parallel with CI, not after it, because chaining would run `verify` twice.
2. WHEN a PR is closed or merged THEN its Convex preview and Vercel preview SHALL be cleaned up or expire without manual action.
3. WHEN a PR changes only `docs/**` or `*.md` THEN CI SHALL skip build and e2e AND `gate` SHALL still report success.
4. WHEN a new commit is pushed to a PR THEN the older run SHALL be cancelled.
5. WHEN a PR is merged to `main` THEN the deploy workflow SHALL deploy Convex and Vercel to production and the build-guard step SHALL pass.
6. WHEN `npm run doctor` runs on a ready machine THEN it SHALL exit 0; IF any check fails THEN it SHALL exit non-zero and name the fix, without printing any secret value.
7. WHEN `npm run feature:new demo` runs THEN it SHALL create the feature skeleton, register the route, and `npm run verify` SHALL pass with no manual edit; running it twice SHALL refuse to overwrite.
8. WHEN production is deployed THEN the page SHALL not show the offline banner and `AI_PROVIDER` on prod SHALL be `mock`.
9. IF the production deploy fails THEN rollback SHALL be documented as one command and tried once in the drill.
10. `npm run verify` SHALL be green at the end of every task.
11. WHEN a session has run many tool calls, spawned several agents, or the agent notices it is re-reading context THEN it SHALL suggest a handoff (one line, not automatic) and, on yes, write `handoff.md` containing: goal, decisions made, current branch/PR/task board state, what is done and verified, next 3 steps, open questions, and files to read first.
12. WHEN a new session starts with "continue from handoff" THEN the agent SHALL read `handoff.md`, confirm the state against `git status` and open PRs, and continue without re-asking settled decisions.

## Design notes

- `vercel.json` stays unchanged: previews are deployed from Actions like production, so Vercel's
  Git integration stays off and nothing deploys twice.
- Preview: new `.github/workflows/preview.yml` on `pull_request`, using a Convex Preview Deploy
  Key stored in a `preview` environment, `convex deploy --preview-name=<branch>` wrapped around
  `vercel build`, then `vercel deploy --prebuilt`. Fork PRs get no secrets, so they skip preview.
- CI skipping: do change detection inside `verify` (a first step sets an output) instead of
  workflow-level `paths:` filters, because a skipped required check stays "Expected" forever.
- `feature:new` copies and renames the `notes` feature through string templates in
  `scripts/feature.mjs`; Convex codegen is run once at the end and `codegen:check` stays the guard.
- `doctor` only reads state (`gh auth status`, `gh secret list`, `convex` config presence, `vercel whoami`).

## Tasks

Each is one reviewable change. T0 and T6 are manual (Michal); the rest are code.

| #   | Task                                                                                                     | Touches                                                                                                                                            | Hot? | Depends |
| --- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| 0   | Verify Convex preview plan (A1)                                                                          | none (read docs/dashboard)                                                                                                                         | no   | none    |
| 1   | Contract PR: scripts, CI, handoff rule                                                                   | `package.json` (+`feature:new`, `doctor`), `.github/workflows/ci.yml` (change detect), `.github/workflows/preview.yml`, `CLAUDE.md` (handoff rule) | yes  | 0       |
| 1b  | Handoff template                                                                                         | `docs/handoff-template.md`                                                                                                                         | no   | 1       |
| 2   | `scripts/doctor.mjs` + test                                                                              | `scripts/doctor.mjs`, `scripts/doctor.test.ts`                                                                                                     | no   | 1       |
| 3   | `scripts/feature.mjs` + templates+test                                                                   | `scripts/feature.mjs`, `scripts/feature.test.ts`, `scripts/templates/**`                                                                           | no   | 1       |
| 4   | Docs (PL): morning runbook, previews                                                                     | `docs/deployment.md`, `docs/development-workflow.md`, `README.md`                                                                                  | no   | 1-3     |
| 5   | Local: Convex anonymous backend + seed                                                                   | none (local only)                                                                                                                                  | no   | none    |
| 6   | Provision prod (manual): `setup:deploy --protect`, `convex env set AI_PROVIDER mock --prod`, preview key | accounts, GitHub settings                                                                                                                          | no   | 1       |
| 7   | Drill: dummy feature PR, preview, merge, prod deploy, rollback; then revert                              | throwaway branch                                                                                                                                   | no   | 1-6     |

Parallel: 2 and 3 have disjoint files and can run together. 5 is independent.

## Task 6 checklist (from the task 1 review)

- Vercel: switch Deployment Protection (Vercel Authentication) off for previews, or the posted
  preview URL will not open for teammates outside the Vercel account.
- Vercel: set a short preview retention, or accept that after Convex's 5-day expiry the Vercel
  preview still loads against a dead backend (AC2 covers Convex only otherwise).
- GitHub: the `preview` environment must not restrict deployment branches to protected ones, or
  every PR preview is blocked.
- Vercel: no `VITE_CONVEX_URL` in the project's Preview environment (the workflow fails if it is there).

## Risks

| Risk                                                | Mitigation                                                          | Owner  |
| --------------------------------------------------- | ------------------------------------------------------------------- | ------ |
| Preview deployments exhaust the 40-deployment limit | Reuse per branch (`--preview-name`); 5-day expiry; prune stale ones | CTO    |
| Vercel Hobby rejects org-repo CLI deploys (A2)      | Drill finds it today; fallback is personal-account repo or Pro      | Michal |
| Merge queue unavailable on the account              | `setup:deploy` prints manual rules; protect with team agreement     | Michal |
| Preview key leaks prod access                       | Preview-scoped key only, in `preview` environment                   | CTO    |
| CI skip logic hides a real failure                  | Skip only for docs-only diffs; `gate` still runs; covered by test   | CTO    |
| Norton TLS interception breaks local `convex`/`gh`  | Use the known CA-bundle workaround, never disable verification      | Michal |

## Open questions

None blocking. A1 and A2 get answered by tasks 0 and 7.
