import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { getAdviceContract, listAdviceContract } from "../lib/contracts/advice";

// Stubs: the team's B1 replaces the handlers. Signatures come from the contract.
export const listAdvice = query({
  ...listAdviceContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const getAdvice = query({
  ...getAdviceContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
