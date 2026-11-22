import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  resolveActor,
  type DemoActor,
  type ResolvedActor,
} from "../lib/demoRole";

export const MODERATOR_ONLY = "Moderacja forum jest dostępna dla kadr.";

// A demo stand-in for login (#42): the role is chosen by the caller, so this is not a safeguard.
export const isModerator = (actor: DemoActor) => actor.role === "hr";

export async function requireModerator(
  ctx: Pick<QueryCtx, "db">,
  actor: DemoActor,
): Promise<ResolvedActor> {
  if (!isModerator(actor)) {
    throw new ConvexError({ code: "denied" as const, message: MODERATOR_ONLY });
  }
  return await resolveActor(ctx, actor);
}

export const isHidden = (thread: Doc<"forumThreads">) =>
  thread.hiddenAt !== undefined;
