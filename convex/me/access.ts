import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";

export function requireEmployee(actor: ResolvedActor): Doc<"employees"> {
  if (actor.role !== "employee" || !actor.employee) {
    throw new ConvexError("Ten widok jest dostępny tylko dla pracownika.");
  }
  return actor.employee;
}

// D11: self-notes belong to the employee; HR may read them, nobody else.
export function canReadSelfNotes(actor: ResolvedActor): boolean {
  return actor.role === "employee" || actor.role === "hr";
}
