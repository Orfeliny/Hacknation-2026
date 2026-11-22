import type { Auth } from "convex/server";
import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";
import { AuthConfigError, loadAuthConfig } from "../auth/config";
import { refuse, resolveOidcActor } from "../auth/identity";
import { demoRole, type DemoRole } from "./validators";

// With AUTH_MODE unset or "demo" this is a stand-in for authentication: the caller names a role and the
// seeded persona answers "who am I". With AUTH_MODE "oidc" the role is only the one the caller wants to act
// in: the employee comes from the verified token and the role must be one the token and the HR data allow.
export const demoActor = v.object({ role: demoRole });

export type DemoActor = Infer<typeof demoActor>;

export type ResolvedActor = {
  role: DemoRole;
  employee: Doc<"employees"> | null;
};

export async function resolveActor(
  ctx: { db: DatabaseReader; auth?: Auth },
  actor: DemoActor,
): Promise<ResolvedActor> {
  let config;
  try {
    config = loadAuthConfig();
  } catch (error) {
    // A broken login configuration refuses the call; it never falls back to the demo personas.
    if (error instanceof AuthConfigError) refuse("misconfigured");
    throw error;
  }
  if (config.mode === "oidc") {
    if (!ctx.auth) refuse("unauthenticated");
    return await resolveOidcActor({ db: ctx.db, auth: ctx.auth }, actor.role);
  }
  const matches = await ctx.db
    .query("employees")
    .withIndex("by_demoPersona", (q) => q.eq("demoPersona", actor.role))
    .take(2);
  if (matches.length > 1) {
    throw new Error(`Two employees share the demo persona "${actor.role}"`);
  }
  return { role: actor.role, employee: matches[0] ?? null };
}
