import { v } from "convex/values";
import { query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { canViewEmployee } from "./access";

// "Mój zespół": a supervisor sees direct reports, HR, the director and the admin see everyone,
// an employee sees only themselves. Archived employees are hidden.
export const team = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = resolved.employee;
    let rows;
    if (resolved.role === "supervisor") {
      if (!me) return [];
      rows = await ctx.db
        .query("employees")
        .withIndex("by_supervisor", (q) => q.eq("supervisorId", me._id))
        .collect();
    } else if (resolved.role === "employee") {
      rows = me ? [me] : [];
    } else {
      rows = await ctx.db.query("employees").collect();
    }
    return rows
      .filter((e) => e.archivedAt === undefined)
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          "pl",
        ),
      );
  },
});

export const card = query({
  args: { actor: demoActor, employeeId: v.id("employees") },
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    const employee = await ctx.db.get(employeeId);
    if (!employee || !canViewEmployee(resolved, employee)) return null;
    const supervisor = employee.supervisorId
      ? await ctx.db.get(employee.supervisorId)
      : null;
    const substitute = employee.substitution
      ? await ctx.db.get(employee.substitution.substituteId)
      : null;
    return {
      employee,
      supervisor,
      substitute,
      staffingEvents: [...(employee.staffingEvents ?? [])].sort((a, b) =>
        b.from.localeCompare(a.from),
      ),
    };
  },
});
