import { ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import {
  createThreadContract,
  replyContract,
  reportContract,
} from "../lib/contracts/forum";

// Stubs: the team's B5 replaces the handlers. Signatures come from the contract.
export const createThread = mutation({
  ...createThreadContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const reply = mutation({
  ...replyContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const report = mutation({
  ...reportContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
