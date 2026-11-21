import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  demoRole,
  isoDate,
  positionKind,
  staffingSituation,
} from "../lib/validators";

export const employeesTables = {
  employees: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    position: v.string(),
    unit: v.string(),
    createdAt: v.number(),
    positionKind: v.optional(positionKind),
    corpsRole: v.optional(
      v.union(v.literal("official"), v.literal("employee")),
    ),
    // Only for corpsRole "employee": art. 81 ust. 1 reviews indefinite contracts only.
    contractTerm: v.optional(
      v.union(v.literal("indefinite"), v.literal("fixed_term")),
    ),
    indefiniteEmploymentSince: v.optional(isoDate),
    email: v.optional(v.string()),
    supervisorId: v.optional(v.id("employees")),
    substitution: v.optional(
      v.object({
        substituteId: v.id("employees"),
        from: isoDate,
        to: v.optional(isoDate),
      }),
    ),
    serviceGrade: v.optional(v.number()),
    serviceGradeSince: v.optional(isoDate),
    appointmentYear: v.optional(v.number()),
    isNewToCivilService: v.optional(v.boolean()),
    demoPersona: v.optional(demoRole),
    // OIDC `sub` claim, reserved for real login (#42).
    authSubject: v.optional(v.string()),
    seedKey: v.optional(v.string()),
    staffingEvents: v.optional(v.array(staffingSituation)),
    archivedAt: v.optional(v.number()),
  })
    .index("by_supervisor", ["supervisorId"])
    .index("by_demoPersona", ["demoPersona"])
    .index("by_seedKey", ["seedKey"])
    .index("by_authSubject", ["authSubject"]),
};
