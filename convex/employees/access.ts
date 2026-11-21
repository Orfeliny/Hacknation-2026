import type { Doc, Id } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";

// Who may see an employee: themselves, their supervisor, HR, the director and the admin.
export function canViewEmployee(
  actor: ResolvedActor,
  employee: Doc<"employees">,
): boolean {
  if (
    actor.role === "hr" ||
    actor.role === "director" ||
    actor.role === "admin"
  ) {
    return true;
  }
  const me = actor.employee?._id;
  if (!me) return false;
  return employee._id === me || employee.supervisorId === me;
}

export function canManageEmployees(actor: ResolvedActor): boolean {
  return actor.role === "hr" || actor.role === "admin";
}

export function requireManager(actor: ResolvedActor): void {
  if (!canManageEmployees(actor)) {
    throw new Error(
      "Tylko kadry albo administrator mogą zmieniać dane pracowników.",
    );
  }
}

export function fullName(
  employee: Pick<Doc<"employees">, "firstName" | "lastName">,
) {
  return `${employee.firstName} ${employee.lastName}`;
}

export type EmployeeId = Id<"employees">;
