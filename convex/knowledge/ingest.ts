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
      title: doc.title,
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

// Parsing is done. The same content under the same source is not imported twice; changed content
// becomes the next version. Chunking and embedding then take the document from `indexing` to `indexed`.
export const saveParsed = internalMutation({
  args: {
    documentId: v.id("knowledgeDocuments"),
    markdown: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, { documentId, markdown, contentHash }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return "missing" as const;
    const siblings = doc.sourceKey
      ? (
          await ctx.db
            .query("knowledgeDocuments")
            .withIndex("by_source_key", (q) => q.eq("sourceKey", doc.sourceKey))
            .take(200)
        ).filter((other) => other._id !== documentId)
      : [];
    const preview = markdown.slice(0, KNOWLEDGE_LIMITS.previewChars);
    const same = siblings.find(
      (other) =>
        other.contentHash === contentHash &&
        (other.status === "indexed" || other.status === "indexing"),
    );
    if (same) {
      await ctx.db.patch(documentId, {
        markdown: preview,
        contentHash,
        status: "failed",
        error: `Ten dokument jest już zaimportowany (wersja ${same.version ?? 1}).`,
      });
      return "duplicate" as const;
    }
    const previous = siblings
      .filter(
        (other) =>
          other.version !== undefined &&
          other.status !== "failed" &&
          other.status !== "needs_fix",
      )
      .sort((x, y) => (y.version ?? 0) - (x.version ?? 0))[0];
    await ctx.db.patch(documentId, {
      markdown: preview,
      contentHash,
      version: (previous?.version ?? 0) + 1,
      supersedesId: previous?._id,
    });
    return "new" as const;
  },
});

// Chunks start inactive: only publishing makes them searchable.
export const insertChunks = internalMutation({
  args: {
    documentId: v.id("knowledgeDocuments"),
    chunks: v.array(
      v.object({
        locator: v.string(),
        text: v.string(),
        order: v.number(),
        contentHash: v.string(),
      }),
    ),
  },
  handler: async (ctx, { documentId, chunks }) => {
    const doc = await ctx.db.get(documentId);
    if (doc?.status !== "indexing") return;
    for (const chunk of chunks) {
      await ctx.db.insert("knowledgeChunks", {
        ...chunk,
        sourceId: documentId,
        sourceTitle: doc.title,
        documentId,
        scope: doc.scope,
        unit: doc.unit,
        active: false,
      });
    }
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

// A document whose action died (timeout, restart) would stay queued or indexing for ever. Past this age
// it is failed with a message, and HR imports it again.
export const STALE_AFTER_MS = 60 * 60 * 1000;

export const failStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_AFTER_MS;
    for (const status of ["queued", "indexing"] as const) {
      const rows = await ctx.db
        .query("knowledgeDocuments")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(50);
      for (const row of rows) {
        if (row.uploadedAt >= cutoff) continue;
        await ctx.db.patch(row._id, {
          status: "failed",
          error:
            "Przetwarzanie zostało przerwane. Usuń dokument i zaimportuj go ponownie.",
        });
      }
    }
  },
});
