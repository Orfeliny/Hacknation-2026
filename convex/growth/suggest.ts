import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { suggestForAreaContract } from "../lib/contracts/iprz";

// Stub: the team's B6 replaces the handler. Signature comes from the contract.
export const suggestForArea = query({
  ...suggestForAreaContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
