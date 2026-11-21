import { ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import {
  addToIprzContract,
  decideFragmentContract,
} from "../lib/contracts/iprz";

// Stubs: the team's B6 replaces the handlers. Signatures come from the contract.
export const decideFragment = mutation({
  ...decideFragmentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const addToIprz = mutation({
  ...addToIprzContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
