import { mutation } from "../_generated/server";
import { AuthConfigError, loadAuthConfig } from "./config";
import { refuse, linkEmployee, type LinkResult } from "./identity";

// Called by the front right after a login. Idempotent: a second call returns the same employee.
export const linkMe = mutation({
  args: {},
  handler: async (ctx): Promise<LinkResult> => {
    let config;
    try {
      config = loadAuthConfig();
    } catch (error) {
      if (error instanceof AuthConfigError) refuse("misconfigured");
      throw error;
    }
    if (config.mode !== "oidc") return { ok: false, code: "misconfigured" };
    return await linkEmployee(ctx, config);
  },
});
