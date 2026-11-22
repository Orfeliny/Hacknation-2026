# OIDC login with Keycloak, on-premise (#42) — plan

Issue: #42 (stretch; blocked by #9 and #23, both closed; soft: #11, #25) · Status: IMPLEMENTED in four PRs
(see "As built"); spike S1-S5 done. Not yet tried: Convex Cloud with a public https Keycloak.

## Goal

Replace the demo role switcher with real login: the user signs in at Keycloak, the backend recognises them from
the token, and the role and the employee come from the token, not from a choice in the header. Login is shown
in the jury demo (decision 3 below) and is the on-premise path; the switcher stays as a switchable fallback.

Out of scope: changing the shape of any contract, schema changes, mobile, an identity provider other than
Keycloak, writing anything back to Active Directory.

## State today (checked in the code)

- **Role is an argument.** About 35 backend functions take `actor: { role }` and call `resolveActor`
  (`convex/lib/demoRole.ts`), which only reads the database: the caller names a role and the seeded persona
  answers "who am I". About 22 frontend call sites pass `{ role }` from `useDemoRole()`. This is a stand-in,
  not security.
- `employees` already has `email`, `authSubject` (OIDC `sub`) and the index `by_authSubject`. No schema change
  is needed for linking.
- There is no `convex/auth.config.ts`. `docker-compose.yml` has `backend`, `dashboard` (profile `admin`) and
  `llm` (profile `ai`). `docs/on-premise.md` lists login as missing.
- Interviews of 21.11 (issue comment): every employee has an e-mail in the office's or the parent office's
  domain; Active Directory exists mostly in large offices; extra verification is "maybe", not a requirement.
  Base variant therefore: confirm identity by e-mail in the office's domain. AD federation is an option for
  large offices.

## External facts (official docs; `unverified` = to settle in the spike)

- Convex: `auth.config.ts` exports `{ providers: [{ domain, applicationID }] }`. `domain` must equal the
  token's `iss`, `applicationID` its `aud`; keys come from `{domain}/.well-known/jwks.json`. Tokens must be OIDC
  ID tokens. `getUserIdentity()` returns `subject`, `issuer`, `tokenIdentifier`, and `email`, `emailVerified`
  when present; custom claims appear as top-level fields (index signature). React side: `ConvexProviderWithAuth`
  with a `useAuth` hook (`isLoading`, `isAuthenticated`, `fetchAccessToken({ forceRefreshToken })`).
  `unverified`: whether a self-hosted backend accepts an `http://` issuer and reaches it from the container;
  how the config is deployed there (likely `npx convex deploy` with `CONVEX_SELF_HOSTED_URL` and the admin
  key); whether `ctx.auth` is propagated to an internal query called from an action.
- Keycloak: image `quay.io/keycloak/keycloak`, current major 26. Realm import: a `<realm>-realm.json` in
  `/opt/keycloak/data/import` with `start --import-realm`; env placeholders `${VAR}` are supported. `start-dev`
  is for local use only; production is `start --optimized`, HTTPS, `KC_HOSTNAME`, a real database, bootstrap
  admin from env. Realm roles reach the token through the "User Realm Role" mapper as `realm_access.roles`
  (switch on "Add to ID token"). There is **no built-in magic link or e-mail OTP**; built in: the
  `VERIFY_EMAIL` required action and the "update password" mail. Active Directory: User federation, LDAP
  provider (vendor AD), passwords are never imported, Kerberos SSO through SPNEGO.
- Libraries: `oidc-client-ts` 3.5.0 (Apache-2.0, 1 dependency `jwt-decode`, ~1.7 MB unpacked) with
  `react-oidc-context` 3.3.1 (MIT, ~118 KB, peer `react >=16.14`, so React 19 is allowed; not tested with it
  yet). Both from the authts organisation.

## Decisions proposed

- D1: `AUTH_MODE` = `demo` (default) or `oidc`, a Convex env. The frontend reads public values
  `VITE_AUTH_MODE`, `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID` (no secrets). Cloud demo stays `demo`.
- D2: **the contracts do not change.** `actor: demoActor` stays in every function. In `oidc` mode it means
  "the role the user wants to act in" and `resolveActor` checks it against the roles from the token. This
  touches one function and leaves the 35 call sites and 22 frontend sites alone.
- D3: the employee comes from `authSubject`. On the first login the backend links the identity to the employee
  whose `email` equals the token's e-mail (case-insensitive, only when `emailVerified`, only for a domain in
  `AUTH_ALLOWED_EMAIL_DOMAINS`) and stores `authSubject`. No match, an unverified e-mail, a foreign domain or
  two employees with one e-mail all give a Polish refusal that tells the person to contact HR.
- D4 (settled): the privileged roles `hr`, `director` and `admin` come from Keycloak realm roles named like the
  demo roles, set by an administrator, never derived. `employee` is always allowed for a linked employee.
  `supervisor` is derived from the HR data: the employee has at least one subordinate (index `by_supervisor`),
  so there is no second list to keep in step with the organisation chart. A person may hold several roles and
  the role tabs show only the allowed ones.
- D5: libraries `oidc-client-ts` and `react-oidc-context`, added in a contract PR (CLAUDE.md: a new dependency
  is a contract PR). A hand-written PKCE flow is rejected.
- D6: Keycloak in `docker-compose.yml`, profile `auth`, image pinned by digest, `start-dev --import-realm` for
  local and demo only. `deploy/keycloak/realm-demo.json`: realm `azymut`, public client `azymut-web`
  (Authorization Code with PKCE, exact redirect URIs and web origins), the five roles, the role mapper with ID
  token on, demo users that mirror `DEMO_PERSONAS` and the seeded employees' e-mails. Passwords for demo users
  come from env placeholders, never from the file. The production variant is documented, not shipped.
- D7: the issuer must be identical everywhere: Keycloak derives `iss` from its hostname, the browser and the
  Convex container reach it by different names. Pin `KC_HOSTNAME` and make that name resolvable from the
  backend container. This is the most likely source of "invalid token", so it is spike item S1.
- D8: small offices: the base variant is built-in only: users are created from the HR list, e-mail is verified,
  the password is set through the mailed "update password" action (SMTP in the realm). Magic link needs an
  extension (`p2-inc/keycloak-magic-link` carries ELv2, `sky-cloak/keycloak-magic-link` is Apache-2.0, link
  only), so it is a follow-up if the team wants it. The domain allowlist is enforced by our linking (D3), not
  by Keycloak.
- D9: Active Directory is documentation only, in `docs/on-premise.md`: LDAP provider with vendor AD, initial
  and periodic sync, Kerberos SSO, passwords stay in AD.
- D10: in `oidc` mode every function that resolves an actor must reject a call without identity
  (`unauthenticated`); otherwise anyone could still name the role `hr`. A test walks the exported functions and
  proves each one that takes `actor` goes through `resolveActor`.
- D11: link, refusal and role-change events go to the audit log (ids only, no e-mail text).
- D12: CI stays in `demo` mode (Keycloak is too heavy for the workflow). OIDC is verified by `convex-test`
  with `withIdentity`, hook tests with a mocked provider, and a manual script against a local Keycloak.
- D13 (from decision 3): the jury demo runs with login, so it needs a Keycloak that its Convex backend can reach.
  Two ways, to be chosen in the spike: (a) the whole stack on one machine with Docker Compose (self-hosted
  Convex, Keycloak, the built frontend), shown live; (b) Keycloak on a public https host and the existing
  cloud deployment pointed at it (Convex Cloud validates tokens against a public issuer; Vercel serves the
  front). (a) needs no public host but depends on one laptop; (b) needs a host, TLS and care with the demo
  users. Either way the switcher is the fallback: `AUTH_MODE=demo` in Convex env plus a front rebuild with
  `VITE_AUTH_MODE=demo` (Vite bakes the variable in at build time, so a fallback during the show must be
  prepared in advance as a second deployment or a prepared build, not switched live).

## Spike results (S1-S4 done locally, 2026-11-22; S5 open)

Setup: Keycloak 26.8.2 (`start-dev --import-realm`, `KC_HOSTNAME=http://keycloak:8080`) and the self-hosted
Convex backend pinned in `docker-compose.yml`, in one Compose network; a probe project with
`convex/auth.config.ts` (`domain` `http://keycloak:8080/realms/azymut`, `applicationID` `azymut-web`) and three
functions (`whoami`, an internal query, an action that calls it). The token was an ID token obtained from
Keycloak. Nothing from the spike is in the repo.

- S1 (done, works): the self-hosted backend accepts a Keycloak ID token over an **`http` issuer** and reaches
  Keycloak by its Compose name. `npx convex deploy` with `CONVEX_SELF_HOSTED_URL` and
  `CONVEX_SELF_HOSTED_ADMIN_KEY` deploys `auth.config.ts` (admin key from
  `docker compose exec backend ./generate_admin_key.sh`). Pinning `KC_HOSTNAME` makes `iss` identical whatever
  host the token was requested through (D7 confirmed). A token with a changed signature and a token with a
  changed payload (role forged to `admin`) are both rejected (`Unauthenticated`); a malformed token is rejected
  with `InvalidAuthHeader`.
- S2 (done): custom claims appear as top-level fields of the identity: a flat `roles: ["hr"]` and a nested
  `realm_access: { roles: ["hr"] }`, next to `email`, `emailVerified`, `subject`, `issuer`, `tokenIdentifier`.
  Decision: add one realm role mapper with the flat claim name `roles` (ID token on) and read `identity.roles`;
  no nested parsing.
- S3 (done, works): the identity reaches an internal query called from an action (`ctx.runQuery`), so the actor
  can keep being resolved inside internal queries.
- S4 (done): realm import with an env placeholder for the user's password works (the user signed in with the
  value from the environment). Cost: images 750 MB (Keycloak) and 810 MB (Convex backend) on disk, Keycloak
  `start-dev` about 700 MB of memory, the backend about 35 MB idle.
- Without a token the identity is `null`, not an error: refusing must be done by our code (D10 confirmed).
- Consequence for the browser: the front must reach Keycloak under the same name as `iss`. On a laptop that
  means an `/etc/hosts` entry `127.0.0.1 keycloak` (or another fixed name with the same value in `KC_HOSTNAME`);
  on a server, a real DNS name behind https.
- Not tested: S5 (`react-oidc-context` on React 19, silent renew with `ConvexProviderWithAuth`; needs the new
  dependencies), Convex Cloud against a public https Keycloak (D13 b), an expired token, a token with the wrong
  audience, Keycloak restarting while the backend is running.

If S5 fails, the fallback is `oidc-client-ts` alone with a small hook of our own around it.

## As built (differences from the plan above)

Four PRs, in this order of dependence: A (Keycloak in Compose, realm, docs) is independent; C (`convex/auth/*`,
`convex/auth.config.ts`) then B (shared files) then D (a guard test) are stacked.

- Linking is an explicit mutation, `auth.mutations.linkMe`, called by the front right after login. The plan said
  the backend links on the first login, but `resolveActor` runs in queries, which cannot write. `linkMe` returns
  `{ ok: false, code }` instead of throwing, so the reason reaches the user and nothing is rolled back; only a
  successful link is written to the audit log (`details: "authLink"`), refusals are not.
- `auth.queries.me` tells the front the mode, whether the user is signed in and linked, the roles they may act in
  and the employee's name. In `demo` mode it returns every role.
- Refusal codes are in `convex/auth/constants.ts` with Polish messages: `unauthenticated`, `not_linked`,
  `ambiguous_email`, `already_linked`, `email_not_verified`, `domain_not_allowed`, `role_not_allowed`,
  `misconfigured`. A broken `AUTH_MODE` or an empty domain list refuses every call (fail closed), never the demo.
- `resolveActor` (the only shared backend change) takes `ctx: { db, auth? }`. All callers already pass their
  `ctx`, so no call site changed.
- The frontend landed entirely in B because the gate lives in `src/app`: `AuthGate` (login, link, refusal,
  app), `OidcProviders` (react-oidc-context with `ConvexProviderWithAuth`), `SignOutButton`, `src/lib/auth.ts`
  (build-time settings, fail closed) and `src/lib/session.ts`. `useDemoRole` returns the first allowed role when
  the stored one is not allowed. Role tabs and the persona in the header follow the session.
- D is only the guard of D10: a test that every backend module that takes an actor calls `resolveActor` (the four
  action modules pass it to an internal query).
- Convex gotcha found by the real run: `auth.config.ts` must read `OIDC_ISSUER` and `OIDC_CLIENT_ID` inside a
  `try/catch`. Reading an unset variable throws and Convex then refuses to deploy, which would break every
  deployment without login (the cloud demo, CI previews). The obvious fix, copying `process.env` with
  `Object.entries`, deploys without an error but the copy is always empty, so no provider is ever configured.
  A test now loads the file with and without the variables.
- Gotcha in `ConvexProviderWithAuth`: the identity of `fetchAccessToken` must change only when the signed-in
  user does. `useAuth()` returns a new object on every state change, so a callback that depends on it makes
  Convex authenticate again in a loop and the screen stays on "Ładowanie…".
- Wrong `docker compose down -v` on the project's own Compose file removes the `data` volume of the self-hosted
  backend; use a separate project name (`-p`) for experiments.

## S5 and the end-to-end run (2026-11-22)

A real browser (Playwright, `--host-resolver-rules` instead of a hosts entry) against Keycloak 26.8.2 and the
self-hosted backend with this repository's functions deployed, the front in `oidc` mode. Three demo accounts:

- `barbara.dabrowska` (realm role `hr`): tabs Pracownik and Kadry.
- `katarzyna.wisniewska` (no realm role, has a subordinate): tabs Przełożony and Pracownik.
- `anna.przykladowa`: tab Pracownik.

Each one: login screen, redirect to Keycloak, back in the app with the right name and tabs, the session survives a
reload, sign-out returns to the login screen. An account with no matching employee gets the refusal message and
never sees the app. So S5 is done: `react-oidc-context` 3.3.1 works with React 19.3.1 and with
`ConvexProviderWithAuth` once `fetchAccessToken` is stable. Still not tried: an expired token, a wrong audience,
Keycloak restarting under a running backend, Convex Cloud against a public https issuer (D13 b).

## Slicing (hot-files rule: shared and unshared files never share a PR)

| PR  | Files                                                                                                                                                                                              | Hot? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| A   | `docker-compose.yml` (profile `auth`), `deploy/keycloak/realm-demo.json`, `.env.docker.example`, the AD section in `docs/on-premise.md`                                                            | no   |
| C   | `convex/auth.config.ts`, `convex/auth/{link,roles}.ts` (first-login link, role mapping, errors), tests with `withIdentity`                                                                         | no   |
| B   | `package.json` and lock (dependencies), `src/app/Providers.tsx` and `RoleTabs` (auth provider, allowed roles), `src/lib/auth.ts`, `convex/lib/demoRole.ts` (`resolveActor` branch), `.env.example` | yes  |
| D   | `src/features/login/**` (sign-in and callback pages, sign-out), the sweep test of D10, docs                                                                                                        | no   |

Order: spike, then A and C in parallel, then B, then D. B imports from C, so C goes first. Each PR is small
enough to review; B is the only one that touches code every module depends on.

## Tests

- Backend (`convex-test`): link on first login, repeat login by `authSubject`, e-mail in a different case,
  unverified e-mail, foreign domain, two employees with one e-mail, a subject already linked to someone else,
  role not in the token, no identity in `oidc` mode, and `demo` mode untouched (the existing tests stay as
  they are).
- Frontend: the `useAuth` adapter (loading, authenticated, token refresh) with a mocked provider; role tabs
  limited to the allowed roles; `demo` mode renders the switcher as before.
- e2e stays in `demo` mode; a manual checklist covers Keycloak.

## Security notes

- No secrets in the repo: demo passwords and the admin password come from env; the realm file holds none.
- Public client with PKCE only; exact redirect URIs; short token life with silent renew; sign-out ends the
  Keycloak session.
- Trust only `emailVerified` e-mails; link by e-mail once, afterwards by `sub`, so a changed e-mail does not
  re-link.
- `AUTH_MODE=oidc` must fail closed: a missing or invalid config refuses all role-bearing calls instead of
  falling back to `demo`.
- The e-mail is read from the token and compared, not stored again (the employee row already has it).

## Questions and answers

Settled by the task owner:

1. Base variant for small offices: built-in e-mail verification and password (D8). A magic-link extension is a
   follow-up only if the team asks for it.
2. Where `supervisor` comes from: derived from the HR data, the privileged roles from Keycloak (D4).
3. Login is needed in the jury demo, not only on-premise (D13). This raises its priority from stretch to part
   of the demo and makes the rollback path (D13) a must.

Still open:

4. Approval for the two new dependencies (D5): taken by the task owner; the review happens in PR B.
5. Demo user passwords: env placeholders (D6) or a documented fixed demo password for the local profile only?
   On a public Keycloak (D13 b) a fixed password is not acceptable.
6. Who owns `docker-compose.yml` after #23, so PR A is agreed with them?
7. Demo topology: (a) one machine with Docker Compose or (b) a public Keycloak with the cloud deployment?
   (a) is proven by the spike; (b) is not tested yet (Convex Cloud against a public https issuer).

## Acceptance criteria (from the issue)

- [ ] In the on-premise variant a user signs in at Keycloak and the backend recognises them from the token.
- [ ] The cloud demo with the role switcher works unchanged.
- [ ] The jury demo runs with login and has a prepared fallback to the role switcher (D13).
- [ ] No secrets in the repo (gitleaks green).
- [ ] `npm run verify` green.
- [ ] `docs/on-premise.md` describes connecting Keycloak to Active Directory.
