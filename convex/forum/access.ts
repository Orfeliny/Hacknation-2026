import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { resolveActor, type DemoActor } from "../lib/demoRole";

// Every role whose demo persona resolves to an employee. A demo stand-in for login (#42).
export async function requireMember(
  ctx: Pick<QueryCtx, "db">,
  actor: DemoActor,
): Promise<Doc<"employees">> {
  const resolved = await resolveActor(ctx, actor);
  if (!resolved.employee) {
    throw new ConvexError(
      "Forum jest dostępne dla osób z danych demo. Wybierz rolę, która ma przypisaną osobę.",
    );
  }
  return resolved.employee;
}
