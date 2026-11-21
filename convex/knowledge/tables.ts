import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  knowledgeDocumentScope,
  knowledgeDocumentStatus,
} from "../lib/contracts/knowledgeDocs";

export const knowledgeTables = {
  knowledgeDocuments: defineTable({
    title: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
    scope: knowledgeDocumentScope,
    unit: v.optional(v.string()),
    status: knowledgeDocumentStatus,
    error: v.optional(v.string()),
    pseudonymized: v.boolean(),
    uploadedById: v.id("employees"),
    uploadedAt: v.number(),
    indexedAt: v.optional(v.number()),
  }),
  knowledgeChunks: defineTable({
    sourceId: v.string(),
    sourceTitle: v.string(),
    locator: v.string(),
    text: v.string(),
    order: v.number(),
    contentHash: v.optional(v.string()),
    documentId: v.optional(v.id("knowledgeDocuments")),
  })
    .index("by_source", ["sourceId", "order"])
    .index("by_document", ["documentId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["sourceId"],
    }),
};
