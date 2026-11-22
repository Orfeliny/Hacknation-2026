import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  dismissReportContract,
  hideThreadContract,
  listReportedThreadsContract,
  restoreThreadContract,
} from "../lib/contracts/forum";

// Stubs: the moderation backend (#104) replaces the handlers. Signatures come from the contract.
export const listReportedThreads = query({
  ...listReportedThreadsContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const hideThread = mutation({
  ...hideThreadContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const restoreThread = mutation({
  ...restoreThreadContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const dismissReport = mutation({
  ...dismissReportContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
