import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import {
  getContract,
  listAwaitingNoticeContract,
  listForEmployeeContract,
  listForSupervisorContract,
} from "../lib/contracts/deadlineShift";

// Stubs: the team's B2 replaces the handlers. Signatures come from the contract.
export const listForSupervisor = query({
  ...listForSupervisorContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const listAwaitingNotice = query({
  ...listAwaitingNoticeContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const listForEmployee = query({
  ...listForEmployeeContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const get = query({
  ...getContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
