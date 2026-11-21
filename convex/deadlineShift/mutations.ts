import { ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import {
  decideContract,
  markNoticeSentContract,
} from "../lib/contracts/deadlineShift";

// Stubs: the team's B2 replaces the handlers. Signatures come from the contract.
export const decide = mutation({
  ...decideContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const markNoticeSent = mutation({
  ...markNoticeSentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
