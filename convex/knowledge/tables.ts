import { defineTable } from "convex/server";
import { v } from "convex/values";

export const knowledgeTables = {
  knowledgeChunks: defineTable({
    sourceId: v.string(),
    sourceTitle: v.string(),
    locator: v.string(),
    text: v.string(),
    order: v.number(),
    contentHash: v.optional(v.string()),
  })
    .index("by_source", ["sourceId", "order"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["sourceId"],
    }),
};
