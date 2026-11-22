# OIDC login with Keycloak, on-premise (#42) — plan

Issue: #42 (stretch; blocked by #9 and #23, both closed; soft: #11, #25) · Status: PLAN, answers 1-3 of the
open questions settled (see the end); the team's OK is still needed before any contract PR. No code is part of
this document.

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

## Spike first (no merge, results into this document and a comment on #42)

1. S1: a Keycloak ID token is accepted by the self-hosted backend: `http` issuer, hostname consistency
   (D7), how `auth.config.ts` is deployed there.
2. S2: `realm_access.roles` is visible on the identity object, and its shape.
3. S3: an internal query called from an action sees the identity (needed by `ask` and the other actions that
   resolve the actor through `askerContext`-style queries).
4. S4: realm import with env placeholders works; image size against the free disk.
5. S5: `react-oidc-context` on React 19 with silent renew, wired into `ConvexProviderWithAuth.fetchAccessToken`.

If S1 or S3 fail, the plan changes: S1 pushes towards a reverse proxy with a single public name and https;
S3 means passing the verified `subject` into internal queries explicitly.

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

4. Approval for the two new dependencies (D5).
5. Demo user passwords: env placeholders (D6) or a documented fixed demo password for the local profile only?
   On a public Keycloak (D13 b) a fixed password is not acceptable.
6. Who owns `docker-compose.yml` after #23, so PR A is agreed with them?
7. Demo topology: (a) one machine with Docker Compose or (b) a public Keycloak with the cloud deployment?
   Decide after spike S1, S2 and S4.

## Acceptance criteria (from the issue)

- [ ] In the on-premise variant a user signs in at Keycloak and the backend recognises them from the token.
- [ ] The cloud demo with the role switcher works unchanged.
- [ ] The jury demo runs with login and has a prepared fallback to the role switcher (D13).
- [ ] No secrets in the repo (gitleaks green).
- [ ] `npm run verify` green.
- [ ] `docs/on-premise.md` describes connecting Keycloak to Active Directory.
