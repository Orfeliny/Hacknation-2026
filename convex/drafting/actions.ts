import { ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { draftReviewContract } from "../lib/contracts/iprz";

// Stub: the team's B6 replaces the handler. Signature comes from the contract.
export const draftReview = action({
  ...draftReviewContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
