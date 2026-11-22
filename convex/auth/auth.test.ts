import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { readAuthConfig } from "./config";
import { resolveOidcActor } from "./identity";
import { allowedRoles, rolesFromClaim } from "./roles";

const modules = import.meta.glob("/convex/**/*.*s");

const DOMAIN = "urzad.example";
const WISNIEWSKA = "katarzyna.wisniewska@urzad.example";
const PRZYKLADOWA = "anna.przykladowa@urzad.example";
const DABROWSKA = "barbara.dabrowska@urzad.example";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  return t;
}
type Db = Awaited<ReturnType<typeof seeded>>;

const oidc = () => {
  vi.stubEnv("AUTH_MODE", "oidc");
  vi.stubEnv("AUTH_ALLOWED_EMAIL_DOMAINS", DOMAIN);
};

const as = (
  t: Db,
  subject: string,
  email: string | undefined,
  extra: Record<string, unknown> = {},
) =>
  t.withIdentity({
    subject,
    issuer: "http://keycloak:8080/realms/azymut",
    emailVerified: true,
    ...(email === undefined ? {} : { email }),
    ...extra,
  });

const link = (t: Db, subject: string, email: string | undefined, extra = {}) =>
  as(t, subject, email, extra).mutation(api.auth.mutations.linkMe, {});

const employeeByEmail = (t: Db, email: string) =>
  t.run(async (ctx) =>
    (await ctx.db.query("employees").collect()).find((e) => e.email === email),
  );

describe("readAuthConfig", () => {
  it("is the role switcher when nothing is set or the mode is 'demo'", () => {
    expect(readAuthConfig({})).toEqual({ mode: "demo" });
    expect(readAuthConfig({ AUTH_MODE: " demo " })).toEqual({ mode: "demo" });
    expect(readAuthConfig({ AUTH_MODE: "" })).toEqual({ mode: "demo" });
  });

  it("reads and normalises the allowed domains in oidc mode", () => {
    expect(
      readAuthConfig({
        AUTH_MODE: "oidc",
        AUTH_ALLOWED_EMAIL_DOMAINS: " Urzad.EXAMPLE , kprm.gov.pl ",
      }),
    ).toEqual({
      mode: "oidc",
      allowedDomains: ["urzad.example", "kprm.gov.pl"],
    });
  });

  it("fails closed on an unknown mode, a missing list and a bad domain", () => {
    expect(() => readAuthConfig({ AUTH_MODE: "OIDC" })).toThrow(/AUTH_MODE/);
    expect(() => readAuthConfig({ AUTH_MODE: "oidc" })).toThrow(
      /AUTH_ALLOWED_EMAIL_DOMAINS/,
    );
    expect(() =>
      readAuthConfig({
        AUTH_MODE: "oidc",
        AUTH_ALLOWED_EMAIL_DOMAINS: "nodot",
      }),
    ).toThrow(/invalid domain/);
    expect(() =>
      readAuthConfig({
        AUTH_MODE: "oidc",
        AUTH_ALLOWED_EMAIL_DOMAINS: "@urzad.example",
      }),
    ).toThrow(/invalid domain/);
  });
});

describe("roles", () => {
  it("takes only the privileged roles from the claim and ignores anything else", () => {
    expect(rolesFromClaim(["hr", "supervisor", "employee", 7, "root"])).toEqual(
      ["hr"],
    );
    expect(rolesFromClaim("hr")).toEqual([]);
    expect(rolesFromClaim(undefined)).toEqual([]);
  });

  it("gives every employee 'employee' and a supervisor only with subordinates", () => {
    expect(allowedRoles(undefined, false)).toEqual(["employee"]);
    expect(allowedRoles([], true)).toEqual(["supervisor", "employee"]);
    expect(allowedRoles(["director", "admin"], true)).toEqual([
      "supervisor",
      "employee",
      "director",
      "admin",
    ]);
  });
});

describe("linkMe", () => {
  it("links the employee with the same verified e-mail and records it in the audit log", async () => {
    oidc();
    const t = await seeded();
    const result = await link(t, "sub-hr", DABROWSKA);
    const employee = await employeeByEmail(t, DABROWSKA);
    expect(result).toEqual({ ok: true, employeeId: employee?._id });
    expect(employee?.authSubject).toBe("sub-hr");
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit.map((a) => [a.entity, a.action, a.details])).toEqual([
      ["employee", "update", "authLink"],
    ]);
  });

  it("is idempotent and finds the employee by subject afterwards, even if the e-mail changed", async () => {
    oidc();
    const t = await seeded();
    await link(t, "sub-hr", DABROWSKA);
    const again = await link(t, "sub-hr", "someone.else@urzad.example");
    expect(again).toMatchObject({ ok: true });
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit).toHaveLength(1);
  });

  it("matches the e-mail ignoring case and spaces", async () => {
    oidc();
    const t = await seeded();
    expect(
      await link(t, "sub-x", `  ${DABROWSKA.toUpperCase()} `),
    ).toMatchObject({ ok: true });
  });

  it.each([
    [
      "unverified e-mail",
      { emailVerified: false },
      DABROWSKA,
      "email_not_verified",
    ],
    ["no e-mail", {}, undefined, "email_not_verified"],
    [
      "foreign domain",
      {},
      "barbara.dabrowska@obca.example",
      "domain_not_allowed",
    ],
    ["unknown address", {}, "ktos.inny@urzad.example", "not_linked"],
  ])("refuses %s", async (_name, extra, email, code) => {
    oidc();
    const t = await seeded();
    expect(await link(t, "sub-1", email, extra)).toEqual({ ok: false, code });
    expect(await t.run((ctx) => ctx.db.query("auditLog").collect())).toEqual(
      [],
    );
  });

  it("refuses an address shared by two employees", async () => {
    oidc();
    const t = await seeded();
    await t.run(async (ctx) => {
      const a = await ctx.db.query("employees").collect();
      const [first, second] = a.filter((e) => e.email !== DABROWSKA);
      await ctx.db.patch(first._id, { email: DABROWSKA });
      await ctx.db.patch(second._id, { email: DABROWSKA });
    });
    expect(await link(t, "sub-1", DABROWSKA)).toEqual({
      ok: false,
      code: "ambiguous_email",
    });
  });

  it("refuses an employee already linked to another account", async () => {
    oidc();
    const t = await seeded();
    await link(t, "sub-first", DABROWSKA);
    expect(await link(t, "sub-second", DABROWSKA)).toEqual({
      ok: false,
      code: "already_linked",
    });
  });

  it("does not link an archived employee", async () => {
    oidc();
    const t = await seeded();
    const e = await employeeByEmail(t, DABROWSKA);
    await t.run((ctx) => ctx.db.patch(e!._id, { archivedAt: Date.now() }));
    expect(await link(t, "sub-1", DABROWSKA)).toEqual({
      ok: false,
      code: "not_linked",
    });
  });

  it("needs a signed-in user", async () => {
    oidc();
    const t = await seeded();
    await expect(
      t.mutation(api.auth.mutations.linkMe, {}),
    ).rejects.toMatchObject({ data: { code: "unauthenticated" } });
  });

  it("refuses everything when the mode is not oidc or the config is broken", async () => {
    const t = await seeded();
    expect(await link(t, "sub-1", DABROWSKA)).toEqual({
      ok: false,
      code: "misconfigured",
    });
    vi.stubEnv("AUTH_MODE", "oidc");
    await expect(link(t, "sub-1", DABROWSKA)).rejects.toMatchObject({
      data: { code: "misconfigured" },
    });
  });
});

describe("resolveOidcActor", () => {
  const resolve = (t: Db, identity: ReturnType<typeof as>, role: never) =>
    identity.run((ctx) => resolveOidcActor(ctx, role));

  it("refuses without identity and for an unlinked identity", async () => {
    const t = await seeded();
    await expect(
      t.run((ctx) => resolveOidcActor(ctx, "employee")),
    ).rejects.toMatchObject({ data: { code: "unauthenticated" } });
    await expect(
      resolve(t, as(t, "sub-nobody", "x@urzad.example"), "employee" as never),
    ).rejects.toMatchObject({ data: { code: "not_linked" } });
  });

  it("allows 'employee' to every linked employee and the privileged roles only from the claim", async () => {
    oidc();
    const t = await seeded();
    await link(t, "sub-hr", DABROWSKA);
    const plain = as(t, "sub-hr", DABROWSKA);
    expect((await resolve(t, plain, "employee" as never)).role).toBe(
      "employee",
    );
    await expect(resolve(t, plain, "hr" as never)).rejects.toMatchObject({
      data: { code: "role_not_allowed" },
    });
    const withRole = as(t, "sub-hr", DABROWSKA, { roles: ["hr"] });
    const actor = await resolve(t, withRole, "hr" as never);
    expect(actor.role).toBe("hr");
    expect(actor.employee?.email).toBe(DABROWSKA);
  });

  it("derives 'supervisor' from having a subordinate", async () => {
    oidc();
    const t = await seeded();
    await link(t, "sub-boss", WISNIEWSKA);
    await link(t, "sub-staff", PRZYKLADOWA);
    const boss = as(t, "sub-boss", WISNIEWSKA);
    expect((await resolve(t, boss, "supervisor" as never)).role).toBe(
      "supervisor",
    );
    const staff = as(t, "sub-staff", PRZYKLADOWA);
    await expect(
      resolve(t, staff, "supervisor" as never),
    ).rejects.toMatchObject({ data: { code: "role_not_allowed" } });
  });

  it("does not count an archived report as a subordinate", async () => {
    oidc();
    const t = await seeded();
    await link(t, "sub-boss", WISNIEWSKA);
    await t.run(async (ctx) => {
      const boss = (await ctx.db.query("employees").collect()).find(
        (e) => e.email === WISNIEWSKA,
      )!;
      const reports = await ctx.db
        .query("employees")
        .withIndex("by_supervisor", (q) => q.eq("supervisorId", boss._id))
        .collect();
      for (const r of reports) await ctx.db.patch(r._id, { archivedAt: 1 });
    });
    await expect(
      resolve(t, as(t, "sub-boss", WISNIEWSKA), "supervisor" as never),
    ).rejects.toMatchObject({ data: { code: "role_not_allowed" } });
  });

  it("does not let an archived employee act", async () => {
    oidc();
    const t = await seeded();
    await link(t, "sub-hr", DABROWSKA);
    const e = await employeeByEmail(t, DABROWSKA);
    await t.run((ctx) => ctx.db.patch(e!._id, { archivedAt: 1 }));
    await expect(
      resolve(t, as(t, "sub-hr", DABROWSKA), "employee" as never),
    ).rejects.toMatchObject({ data: { code: "not_linked" } });
  });
});

describe("me", () => {
  it("reports demo mode with every role allowed", async () => {
    const t = await seeded();
    expect(await t.query(api.auth.queries.me, {})).toEqual({
      mode: "demo",
      allowedRoles: ["supervisor", "employee", "hr", "director", "admin"],
    });
  });

  it("reports a broken configuration instead of falling back to demo", async () => {
    vi.stubEnv("AUTH_MODE", "oidc");
    const t = await seeded();
    expect(await t.query(api.auth.queries.me, {})).toEqual({
      mode: "misconfigured",
    });
  });

  it("walks from signed out, to signed in but unlinked, to linked with roles", async () => {
    oidc();
    const t = await seeded();
    expect(await t.query(api.auth.queries.me, {})).toEqual({
      mode: "oidc",
      authenticated: false,
    });
    const identity = as(t, "sub-hr", DABROWSKA, { roles: ["hr"] });
    expect(await identity.query(api.auth.queries.me, {})).toEqual({
      mode: "oidc",
      authenticated: true,
      linked: false,
    });
    await link(t, "sub-hr", DABROWSKA, { roles: ["hr"] });
    const me = await identity.query(api.auth.queries.me, {});
    expect(me).toMatchObject({
      mode: "oidc",
      authenticated: true,
      linked: true,
      allowedRoles: ["employee", "hr"],
      employee: { firstName: "Barbara", lastName: "Dąbrowska" },
    });
    expect(JSON.stringify(me)).not.toContain(DABROWSKA);
  });
});
