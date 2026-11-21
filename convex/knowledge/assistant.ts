import { ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { askContract } from "../lib/contracts/knowledgeDocs";

// Stub: the team's B4 replaces the handler. Signature comes from the contract.
export const ask = action({
  ...askContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
