import { query } from "../_generated/server";
import { AuthConfigError, loadAuthConfig } from "./config";
import { DEMO_ROLES_ALL } from "./constants";
import { employeeBySubject, rolesOf } from "./identity";

// What the front needs to decide what to show: the mode, whether the user is signed in and linked, and the
// roles they may act in. In `demo` mode every role is allowed (the role switcher).
export const me = query({
  args: {},
  handler: async (ctx) => {
    let config;
    try {
      config = loadAuthConfig();
    } catch (error) {
      if (error instanceof AuthConfigError) {
        return { mode: "misconfigured" as const };
      }
      throw error;
    }
    if (config.mode === "demo") {
      return { mode: "demo" as const, allowedRoles: [...DEMO_ROLES_ALL] };
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return { mode: "oidc" as const, authenticated: false as const };
    const employee = await employeeBySubject(ctx.db, identity.subject);
    if (!employee) {
      return {
        mode: "oidc" as const,
        authenticated: true as const,
        linked: false as const,
      };
    }
    return {
      mode: "oidc" as const,
      authenticated: true as const,
      linked: true as const,
      allowedRoles: await rolesOf(ctx.db, employee, identity),
      employee: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
      },
    };
  },
});
