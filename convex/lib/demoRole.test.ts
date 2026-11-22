import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import schema from "../schema";
import { resolveActor } from "./demoRole";

const modules = import.meta.glob("/convex/**/*.*s");

const person = (demoPersona: "supervisor" | "hr") => ({
  firstName: "A",
  lastName: "B",
  position: "C",
  unit: "D",
  createdAt: 0,
  demoPersona,
});

describe("resolveActor", () => {
  it("returns the seeded persona for a role", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const id = await ctx.db.insert("employees", person("supervisor"));
      const actor = await resolveActor(ctx, { role: "supervisor" });
      expect(actor.role).toBe("supervisor");
      expect(actor.employee?._id).toBe(id);
    });
  });

  it("returns employee null when no persona is seeded", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      expect(await resolveActor(ctx, { role: "director" })).toEqual({
        role: "director",
        employee: null,
      });
    });
  });

  it("throws when two employees share a persona", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("employees", person("hr"));
      await ctx.db.insert("employees", person("hr"));
      await expect(resolveActor(ctx, { role: "hr" })).rejects.toThrow(
        /share the demo persona/,
      );
    });
  });
});

describe("resolveActor in oidc mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const hr = () => ({
    ...person("hr"),
    email: "hr@urzad.example",
    authSubject: "sub-hr",
  });

  const asHr = (roles: string[]) => ({
    subject: "sub-hr",
    issuer: "http://keycloak:8080/realms/azymut",
    email: "hr@urzad.example",
    emailVerified: true,
    roles,
  });

  it("ignores the persona and takes the employee from the token", async () => {
    vi.stubEnv("AUTH_MODE", "oidc");
    vi.stubEnv("AUTH_ALLOWED_EMAIL_DOMAINS", "urzad.example");
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) => ctx.db.insert("employees", hr()));
    await t.run((ctx) =>
      ctx.db.insert("employees", { ...person("supervisor") }),
    );
    const as = t.withIdentity(asHr(["hr"]));
    await as.run(async (ctx) => {
      const actor = await resolveActor(ctx, { role: "hr" });
      expect(actor.employee?._id).toBe(id);
    });
  });

  it("refuses a role the token does not carry, even though the persona exists", async () => {
    vi.stubEnv("AUTH_MODE", "oidc");
    vi.stubEnv("AUTH_ALLOWED_EMAIL_DOMAINS", "urzad.example");
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert("employees", hr()));
    const as = t.withIdentity(asHr([]));
    await as.run(async (ctx) => {
      await expect(resolveActor(ctx, { role: "hr" })).rejects.toMatchObject({
        data: { code: "role_not_allowed" },
      });
    });
  });

  it("refuses a call without identity instead of answering with a persona", async () => {
    vi.stubEnv("AUTH_MODE", "oidc");
    vi.stubEnv("AUTH_ALLOWED_EMAIL_DOMAINS", "urzad.example");
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert("employees", hr()));
    await t.run(async (ctx) => {
      await expect(resolveActor(ctx, { role: "hr" })).rejects.toMatchObject({
        data: { code: "unauthenticated" },
      });
      await expect(
        resolveActor({ db: ctx.db }, { role: "hr" }),
      ).rejects.toMatchObject({ data: { code: "unauthenticated" } });
    });
  });

  it("refuses everything when the configuration is broken, never falling back to the persona", async () => {
    vi.stubEnv("AUTH_MODE", "oidc");
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert("employees", hr()));
    await t.run(async (ctx) => {
      await expect(resolveActor(ctx, { role: "hr" })).rejects.toMatchObject({
        data: { code: "misconfigured" },
      });
    });
  });

  it("is untouched in demo mode, with or without an identity", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) => ctx.db.insert("employees", person("hr")));
    await t.run(async (ctx) => {
      expect((await resolveActor(ctx, { role: "hr" })).employee?._id).toBe(id);
    });
    await t.withIdentity({ subject: "whoever" }).run(async (ctx) => {
      expect((await resolveActor(ctx, { role: "hr" })).employee?._id).toBe(id);
    });
  });
});
