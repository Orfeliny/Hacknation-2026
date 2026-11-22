import { ConvexError } from "convex/values";
import type { Auth } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import { logAudit } from "../audit/log";
import type { DemoRole } from "../lib/validators";
import type { ResolvedActor } from "../lib/demoRole";
import { AUTH_REFUSALS, type AuthRefusal } from "./constants";
import type { AuthConfig } from "./config";
import { allowedRoles } from "./roles";

export function refuse(code: AuthRefusal): never {
  throw new ConvexError({ code, message: AUTH_REFUSALS[code] });
}

type Identity = NonNullable<Awaited<ReturnType<Auth["getUserIdentity"]>>>;

export async function requireIdentity(ctx: { auth: Auth }): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) refuse("unauthenticated");
  return identity;
}

async function hasSubordinates(
  db: DatabaseReader,
  employee: Doc<"employees">,
): Promise<boolean> {
  const reports = await db
    .query("employees")
    .withIndex("by_supervisor", (q) => q.eq("supervisorId", employee._id))
    .collect();
  return reports.some((report) => report.archivedAt === undefined);
}

export async function employeeBySubject(
  db: DatabaseReader,
  subject: string,
): Promise<Doc<"employees"> | null> {
  const matches = await db
    .query("employees")
    .withIndex("by_authSubject", (q) => q.eq("authSubject", subject))
    .take(2);
  if (matches.length > 1) refuse("ambiguous_email");
  const employee = matches[0] ?? null;
  return employee && employee.archivedAt === undefined ? employee : null;
}

export async function rolesOf(
  db: DatabaseReader,
  employee: Doc<"employees">,
  identity: Identity,
): Promise<DemoRole[]> {
  return allowedRoles(identity.roles, await hasSubordinates(db, employee));
}

// The caller names the role it wants to act in; it is honoured only when the token and the HR data allow it.
export async function resolveOidcActor(
  ctx: { db: DatabaseReader; auth: Auth },
  requested: DemoRole,
): Promise<ResolvedActor> {
  const identity = await requireIdentity(ctx);
  const employee = await employeeBySubject(ctx.db, identity.subject);
  if (!employee) refuse("not_linked");
  const roles = await rolesOf(ctx.db, employee, identity);
  if (!roles.includes(requested)) refuse("role_not_allowed");
  return { role: requested, employee };
}

export type LinkResult =
  | { ok: true; employeeId: Doc<"employees">["_id"] }
  | { ok: false; code: AuthRefusal };

// First login: links the signed-in identity to the employee with the same verified e-mail, once. Afterwards
// the employee is found by `sub`, so a changed e-mail address does not re-link anyone. Returns the refusal
// instead of throwing, so the reason reaches the user and nothing is rolled back.
export async function linkEmployee(
  ctx: { db: DatabaseWriter; auth: Auth },
  config: Extract<AuthConfig, { mode: "oidc" }>,
): Promise<LinkResult> {
  const identity = await requireIdentity(ctx);
  const linked = await employeeBySubject(ctx.db, identity.subject);
  if (linked) return { ok: true, employeeId: linked._id };

  if (identity.emailVerified !== true || !identity.email) {
    return { ok: false, code: "email_not_verified" };
  }
  const email = identity.email.trim().toLowerCase();
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (!config.allowedDomains.includes(domain)) {
    return { ok: false, code: "domain_not_allowed" };
  }

  const all = await ctx.db.query("employees").collect();
  const matches = all.filter(
    (e) =>
      e.archivedAt === undefined && e.email?.trim().toLowerCase() === email,
  );
  if (matches.length === 0) return { ok: false, code: "not_linked" };
  const [employee] = matches;
  if (matches.length > 1 || !employee) {
    return { ok: false, code: "ambiguous_email" };
  }
  if (employee.authSubject !== undefined) {
    return { ok: false, code: "already_linked" };
  }

  await ctx.db.patch(employee._id, { authSubject: identity.subject });
  await logAudit(ctx, {
    actor: { role: "employee", employee },
    action: "update",
    entity: "employee",
    entityId: employee._id,
    details: "authLink",
  });
  return { ok: true, employeeId: employee._id };
}
