// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export type AuthConfig =
  { mode: "demo" } | { mode: "oidc"; allowedDomains: string[] };

export class AuthConfigError extends Error {}

const DOMAIN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

// A missing AUTH_MODE means the role switcher. Any other value than "demo" or "oidc", and an `oidc` mode
// without a usable domain list, is an error: the login must fail closed, never fall back to the switcher.
export function readAuthConfig(
  env: Record<string, string | undefined>,
): AuthConfig {
  const mode = env.AUTH_MODE?.trim();
  if (mode === undefined || mode === "" || mode === "demo") {
    return { mode: "demo" };
  }
  if (mode !== "oidc") {
    throw new AuthConfigError('AUTH_MODE must be "demo" or "oidc".');
  }
  const allowedDomains = (env.AUTH_ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  if (allowedDomains.length === 0) {
    throw new AuthConfigError(
      "AUTH_ALLOWED_EMAIL_DOMAINS must list at least one domain when AUTH_MODE is oidc.",
    );
  }
  const bad = allowedDomains.find((domain) => !DOMAIN.test(domain));
  if (bad !== undefined) {
    throw new AuthConfigError(
      "AUTH_ALLOWED_EMAIL_DOMAINS has an invalid domain.",
    );
  }
  return { mode: "oidc", allowedDomains };
}

export const loadAuthConfig = (): AuthConfig => readAuthConfig(process.env);
