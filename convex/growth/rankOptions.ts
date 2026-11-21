import { ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { rankOptionsContract } from "../lib/contracts/iprz";

// Stub: the team's B6 replaces the handler. Signature comes from the contract.
export const rankOptions = action({
  ...rankOptionsContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
