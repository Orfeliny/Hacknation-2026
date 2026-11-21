import { defineTable } from "convex/server";
import { v } from "convex/values";

export const __name__Tables = {
  __name__: defineTable({
    text: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
};
