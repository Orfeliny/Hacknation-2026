import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { ResolvedActor } from "../lib/demoRole";

// Who prepares a conversation: the employee's supervisor or the evaluator of their open review.
export async function isEvaluatorOf(
  ctx: QueryCtx,
  me: Id<"employees"> | undefined,
  employeeId: Id<"employees">,
): Promise<boolean> {
  if (!me) return false;
  const employee = await ctx.db.get(employeeId);
  if (employee?.supervisorId === me) return true;
  const reviews = await ctx.db
    .query("reviews")
    .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
    .collect();
  return reviews.some((r) => r.stage !== "closed" && r.evaluatorId === me);
}

// A plan is the evaluator's working material: the author and HR read it, the employee does not.
export function canReadConversation(
  actor: ResolvedActor,
  conversation: Doc<"conversations">,
): boolean {
  const me = actor.employee?._id;
  // Built from notes about the subject, so nobody reads a plan about themselves.
  if (me && conversation.employeeId === me) return false;
  if (actor.role === "hr") return true;
  return conversation.authorId === me;
}
