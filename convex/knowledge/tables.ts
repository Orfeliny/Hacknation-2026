import { defineTable } from "convex/server";
import { v } from "convex/values";
import { EMBEDDING_DIMENSIONS } from "../ai/types";
import {
  knowledgeChecklist,
  knowledgeDocumentScope,
  knowledgeDocumentStatus,
  knowledgeSourceKind,
} from "../lib/contracts/knowledgeDocs";

export const knowledgeTables = {
  knowledgeDocuments: defineTable({
    title: v.string(),
    fileName: v.string(),
    // Absent for a document imported from a link.
    storageId: v.optional(v.id("_storage")),
    scope: knowledgeDocumentScope,
    unit: v.optional(v.string()),
    status: knowledgeDocumentStatus,
    error: v.optional(v.string()),
    pseudonymized: v.boolean(),
    uploadedById: v.id("employees"),
    uploadedAt: v.number(),
    indexedAt: v.optional(v.number()),
    description: v.optional(v.string()),
    sourceKind: v.optional(knowledgeSourceKind),
    sourceUrl: v.optional(v.string()),
    // Same source, new content: normalised link, ELI id or title plus scope. Versions share a key.
    sourceKey: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    version: v.optional(v.number()),
    supersedesId: v.optional(v.id("knowledgeDocuments")),
    checklist: v.optional(knowledgeChecklist),
    eliId: v.optional(v.string()),
    embeddingModel: v.optional(v.string()),
    // Parsed Markdown for the preview, capped at KNOWLEDGE_LIMITS.previewChars.
    markdown: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_source_key", ["sourceKey", "version"])
    .index("by_status", ["status"]),
  knowledgeChunks: defineTable({
    sourceId: v.string(),
    sourceTitle: v.string(),
    locator: v.string(),
    text: v.string(),
    order: v.number(),
    contentHash: v.optional(v.string()),
    documentId: v.optional(v.id("knowledgeDocuments")),
    // Copied from the document so a vector search can filter on them.
    scope: v.optional(knowledgeDocumentScope),
    unit: v.optional(v.string()),
    // True only for chunks of a published, current version.
    active: v.optional(v.boolean()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_source", ["sourceId", "order"])
    .index("by_document", ["documentId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["sourceId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSIONS,
      filterFields: ["scope", "unit", "active"],
    }),
};
