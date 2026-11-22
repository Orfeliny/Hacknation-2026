import { describe, expect, it } from "vitest";
import { parseAuthSettings } from "./auth";

describe("parseAuthSettings", () => {
  it("is the role switcher when nothing is set or the mode is 'demo'", () => {
    expect(parseAuthSettings({})).toEqual({ mode: "demo" });
    expect(parseAuthSettings({ VITE_AUTH_MODE: "" })).toEqual({ mode: "demo" });
    expect(parseAuthSettings({ VITE_AUTH_MODE: " demo " })).toEqual({
      mode: "demo",
    });
  });

  it("reads the authority and the client in oidc mode", () => {
    expect(
      parseAuthSettings({
        VITE_AUTH_MODE: "oidc",
        VITE_OIDC_AUTHORITY: "http://keycloak:8080/realms/azymut",
        VITE_OIDC_CLIENT_ID: "azymut-web",
      }),
    ).toEqual({
      mode: "oidc",
      authority: "http://keycloak:8080/realms/azymut",
      clientId: "azymut-web",
    });
  });

  it("throws on an unknown mode and on a half-configured oidc mode", () => {
    expect(() => parseAuthSettings({ VITE_AUTH_MODE: "OIDC" })).toThrow(
      /Invalid login settings/,
    );
    expect(() => parseAuthSettings({ VITE_AUTH_MODE: "oidc" })).toThrow(
      /VITE_OIDC_AUTHORITY/,
    );
    expect(() =>
      parseAuthSettings({
        VITE_AUTH_MODE: "oidc",
        VITE_OIDC_AUTHORITY: "not a url",
        VITE_OIDC_CLIENT_ID: "azymut-web",
      }),
    ).toThrow(/VITE_OIDC_AUTHORITY/);
    expect(() =>
      parseAuthSettings({
        VITE_AUTH_MODE: "oidc",
        VITE_OIDC_AUTHORITY: "http://keycloak:8080/realms/azymut",
      }),
    ).toThrow(/VITE_OIDC_CLIENT_ID/);
  });
});
