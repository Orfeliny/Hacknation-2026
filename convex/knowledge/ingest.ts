import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { KNOWLEDGE_LIMITS } from "../lib/contracts/knowledgeDocs";

export const getForParsing = internalQuery({
  args: { documentId: v.id("knowledgeDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;
    return {
      status: doc.status,
      fileName: doc.fileName,
      storageId: doc.storageId,
      sourceUrl: doc.sourceUrl,
      eliId: doc.eliId,
    };
  },
});

// Claims the document: only a queued one moves on, so a repeated run does nothing.
export const claim = internalMutation({
  args: { documentId: v.id("knowledgeDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (doc?.status !== "queued") return false;
    await ctx.db.patch(documentId, { status: "indexing", error: undefined });
    return true;
  },
});

// Parsing is done; chunking and embedding (RAG-2) take the document from `indexing` to `indexed`.
export const saveParsed = internalMutation({
  args: {
    documentId: v.id("knowledgeDocuments"),
    markdown: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, { documentId, markdown, contentHash }) => {
    await ctx.db.patch(documentId, {
      markdown: markdown.slice(0, KNOWLEDGE_LIMITS.previewChars),
      contentHash,
    });
  },
});

export const fail = internalMutation({
  args: {
    documentId: v.id("knowledgeDocuments"),
    status: v.union(v.literal("failed"), v.literal("needs_fix")),
    error: v.string(),
  },
  handler: async (ctx, { documentId, status, error }) => {
    await ctx.db.patch(documentId, { status, error });
  },
});
