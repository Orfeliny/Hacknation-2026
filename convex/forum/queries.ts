import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { getThreadContract, listThreadsContract } from "../lib/contracts/forum";

// Stubs: the team's B5 replaces the handlers. Signatures come from the contract.
export const listThreads = query({
  ...listThreadsContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const getThread = query({
  ...getThreadContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
