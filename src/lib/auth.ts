import { z } from "zod";

// `demo` is the role switcher (the default). `oidc` is the real login through Keycloak. These are public
// build-time values: there is no secret here (the client is public and uses PKCE).
export type AuthSettings =
  { mode: "demo" } | { mode: "oidc"; authority: string; clientId: string };

const trimmed = z.string().trim();

const schema = z
  .object({
    VITE_AUTH_MODE: trimmed.optional(),
    VITE_OIDC_AUTHORITY: trimmed.optional(),
    VITE_OIDC_CLIENT_ID: trimmed.optional(),
  })
  .transform((raw, ctx): AuthSettings => {
    const mode = raw.VITE_AUTH_MODE ?? "";
    if (mode === "" || mode === "demo") return { mode: "demo" };
    if (mode !== "oidc") {
      ctx.addIssue({
        code: "custom",
        message: 'VITE_AUTH_MODE must be "demo" or "oidc"',
      });
      return z.NEVER;
    }
    const authority = raw.VITE_OIDC_AUTHORITY ?? "";
    const clientId = raw.VITE_OIDC_CLIENT_ID ?? "";
    if (!z.url().safeParse(authority).success || clientId === "") {
      ctx.addIssue({
        code: "custom",
        message:
          "VITE_OIDC_AUTHORITY (a URL) and VITE_OIDC_CLIENT_ID are required when VITE_AUTH_MODE is oidc",
      });
      return z.NEVER;
    }
    return { mode: "oidc", authority, clientId };
  });

// An invalid value throws: the app must not start with a half-configured login.
export function parseAuthSettings(raw: Record<string, unknown>): AuthSettings {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid login settings: ${result.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return result.data;
}

export const getAuthSettings = (): AuthSettings =>
  parseAuthSettings(import.meta.env);
