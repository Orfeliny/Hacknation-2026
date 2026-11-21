import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";
import { denied } from "./errors";

// Signals about a person are for their supervisor. HR gets counts only (see hrSummary) and the
// employee role never reads them. Nobody reads signals about themselves.
export function isSupervisorOf(
  actor: ResolvedActor,
  employee: Doc<"employees">,
): boolean {
  const me = actor.employee?._id;
  if (actor.role === "employee" || actor.role === "hr" || !me) return false;
  return employee.supervisorId === me && employee._id !== me;
}

export function requireSupervisor(actor: ResolvedActor): Doc<"employees"> {
  if (actor.role === "employee" || actor.role === "hr") {
    throw denied("Sygnały HR partnera widzi przełożony pracownika.");
  }
  if (!actor.employee) {
    throw denied("Dla wybranej roli nie ma przypisanego pracownika.");
  }
  return actor.employee;
}

export function requireHr(actor: ResolvedActor): void {
  if (actor.role !== "hr") {
    throw denied("Zestawienie zbiorcze jest dostępne dla kadr.");
  }
}
