import { DEMO_ROLES_ALL } from "./constants";
import type { DemoRole } from "../lib/validators";

// `hr`, `director` and `admin` come from Keycloak realm roles and are never derived. `employee` belongs to
// every linked employee and `supervisor` to anyone who has a subordinate.
export const PRIVILEGED_ROLES = ["hr", "director", "admin"] as const;

export function rolesFromClaim(claim: unknown): DemoRole[] {
  if (!Array.isArray(claim)) return [];
  const names = new Set(
    claim.filter((x): x is string => typeof x === "string"),
  );
  return PRIVILEGED_ROLES.filter((role) => names.has(role));
}

export function allowedRoles(
  claim: unknown,
  hasSubordinates: boolean,
): DemoRole[] {
  const granted = new Set<DemoRole>(["employee", ...rolesFromClaim(claim)]);
  if (hasSubordinates) granted.add("supervisor");
  return DEMO_ROLES_ALL.filter((role) => granted.has(role));
}
