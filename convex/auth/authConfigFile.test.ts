import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const providers = async () => {
  vi.resetModules();
  const config = (await import("../auth.config")).default;
  return config.providers;
};

// The file is evaluated once at deploy time, so each case loads it afresh.
describe("convex/auth.config.ts", () => {
  it("has no provider when nothing is configured, so a deployment without login is unaffected", async () => {
    expect(await providers()).toEqual([]);
  });

  it("registers the issuer and the client when both are set", async () => {
    vi.stubEnv("OIDC_ISSUER", " http://keycloak:8080/realms/azymut ");
    vi.stubEnv("OIDC_CLIENT_ID", "azymut-web");
    expect(await providers()).toEqual([
      {
        domain: "http://keycloak:8080/realms/azymut",
        applicationID: "azymut-web",
      },
    ]);
  });

  it("registers nothing when only one of them is set or they are blank", async () => {
    vi.stubEnv("OIDC_ISSUER", "http://keycloak:8080/realms/azymut");
    expect(await providers()).toEqual([]);
    vi.stubEnv("OIDC_CLIENT_ID", "   ");
    expect(await providers()).toEqual([]);
  });
});
