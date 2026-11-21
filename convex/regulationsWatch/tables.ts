import { defineTable } from "convex/server";
import { v } from "convex/values";

export const regulationsWatchTables = {
  regulationWatch: defineTable({
    eliId: v.string(),
    title: v.string(),
    checkedAt: v.number(),
    lastChangeDate: v.optional(v.string()),
    changeDetectedAt: v.optional(v.number()),
    acknowledgedAt: v.optional(v.number()),
  }).index("by_eliId", ["eliId"]),
};
