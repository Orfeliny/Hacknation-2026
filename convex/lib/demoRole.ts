import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";
import { demoRole, type DemoRole } from "./validators";

// Demo stand-in for authentication: the caller names a role, the seeded persona answers "who am I".
export const demoActor = v.object({ role: demoRole });

export type DemoActor = Infer<typeof demoActor>;

export type ResolvedActor = {
  role: DemoRole;
  employee: Doc<"employees"> | null;
};

export async function resolveActor(
  ctx: { db: DatabaseReader },
  actor: DemoActor,
): Promise<ResolvedActor> {
  const matches = await ctx.db
    .query("employees")
    .withIndex("by_demoPersona", (q) => q.eq("demoPersona", actor.role))
    .take(2);
  if (matches.length > 1) {
    throw new Error(`Two employees share the demo persona "${actor.role}"`);
  }
  return { role: actor.role, employee: matches[0] ?? null };
}
