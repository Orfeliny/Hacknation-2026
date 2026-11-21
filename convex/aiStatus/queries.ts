import { query } from "../_generated/server";
import { describeAI } from "./classify";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export const status = query({
  args: {},
  handler: () => describeAI(process.env),
});
