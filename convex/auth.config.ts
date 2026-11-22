// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

// Convex accepts a token only when `iss` equals `domain` and `aud` equals `applicationID`. Without both
// variables there is no provider, so a deployment that does not use login (the cloud demo, CI previews) is
// unaffected. Convex throws when a variable that is not set is read here, and refuses to deploy when that
// error escapes, so each read is guarded. Do not copy `process.env` instead: that copy is always empty.
function readEnv(name: "OIDC_ISSUER" | "OIDC_CLIENT_ID"): string | undefined {
  try {
    return process.env[name]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

const issuer = readEnv("OIDC_ISSUER");
const clientId = readEnv("OIDC_CLIENT_ID");

export default {
  providers:
    issuer && clientId ? [{ domain: issuer, applicationID: clientId }] : [],
};
