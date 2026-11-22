import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { getProvider } from "../ai/index";
import { AIProviderError, MAX_EMBED_BATCH } from "../ai/types";

declare const process: { env: Record<string, string | undefined> };

const CHUNKS_PER_JOB = 100;
// Patching a chunk rewrites its 8 KB embedding, so switching is done in small steps with a pause to stay
// under the write rate limit.
const SET_ACTIVE_PER_JOB = 25;
const SET_ACTIVE_PAUSE_MS = 250;

// The next chunks after a cursor, oldest first. `null` stops the job: the document was removed,
// withdrawn or is no longer being indexed.
export const nextBatch = internalQuery({
  args: { documentId: v.id("knowledgeDocuments"), after: v.number() },
  handler: async (ctx, { documentId, after }) => {
    const doc = await ctx.db.get(documentId);
    if (doc?.status !== "indexing") return null;
    const rows = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_document", (q) =>
        q.eq("documentId", documentId).gt("_creationTime", after),
      )
      .take(MAX_EMBED_BATCH);
    return rows.map((row) => ({
      id: row._id,
      text: row.text,
      embedded: row.embedding !== undefined,
      at: row._creationTime,
    }));
  },
});

export const storeEmbeddings = internalMutation({
  args: {
    documentId: v.id("knowledgeDocuments"),
    model: v.string(),
    items: v.array(
      v.object({
        id: v.id("knowledgeChunks"),
        embedding: v.array(v.float64()),
      }),
    ),
  },
  handler: async (ctx, { documentId, model, items }) => {
    for (const item of items) {
      await ctx.db.patch(item.id, { embedding: item.embedding });
    }
    await ctx.db.patch(documentId, { embeddingModel: model });
  },
});

export const markIndexed = internalMutation({
  args: { documentId: v.id("knowledgeDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (doc?.status !== "indexing") return;
    await ctx.db.patch(documentId, {
      status: "indexed",
      indexedAt: Date.now(),
      error: undefined,
    });
  },
});

function failureMessage(error: unknown): string {
  if (error instanceof AIProviderError) {
    return `Nie udało się przygotować dokumentu do wyszukiwania (usługa AI: ${error.code}). Spróbuj ponownie później.`;
  }
  return "Nie udało się przygotować dokumentu do wyszukiwania. Spróbuj ponownie później.";
}

// One batch of up to 64 chunks per run; the next run is scheduled until none are left. Chunks that
// already have a vector are skipped, so a restart does not embed twice.
export const embedDocument = internalAction({
  args: { documentId: v.id("knowledgeDocuments"), after: v.number() },
  handler: async (ctx, { documentId, after }) => {
    const batch = await ctx.runQuery(internal.knowledge.indexing.nextBatch, {
      documentId,
      after,
    });
    if (batch === null) return;
    const last = batch[batch.length - 1];
    if (!last) {
      await ctx.runMutation(internal.knowledge.indexing.markIndexed, {
        documentId,
      });
      return;
    }
    const todo = batch.filter((row) => !row.embedded);
    try {
      if (todo.length > 0) {
        const result = await getProvider(parseAIConfig(process.env)).embed({
          texts: todo.map((row) => row.text),
        });
        await ctx.runMutation(internal.knowledge.indexing.storeEmbeddings, {
          documentId,
          model: result.model,
          items: todo.map((row, index) => ({
            id: row.id,
            embedding: result.vectors[index] ?? [],
          })),
        });
      }
    } catch (error) {
      console.error(
        "knowledge embedding failed",
        error instanceof AIProviderError ? error.code : (error as Error).name,
      );
      await ctx.runMutation(internal.knowledge.ingest.fail, {
        documentId,
        status: "failed",
        error: failureMessage(error),
      });
      return;
    }
    await ctx.scheduler.runAfter(0, internal.knowledge.indexing.embedDocument, {
      documentId,
      after: last.at,
    });
  },
});

// Switches the chunks of one document, then optionally those of another (publish: activate the new
// version, then deactivate the old one; withdraw: the other way round).
export const setActive = internalMutation({
  args: {
    documentId: v.id("knowledgeDocuments"),
    active: v.boolean(),
    cursor: v.union(v.string(), v.null()),
    next: v.optional(
      v.object({ documentId: v.id("knowledgeDocuments"), active: v.boolean() }),
    ),
  },
  handler: async (ctx, { documentId, active, cursor, next }) => {
    const page = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .paginate({ numItems: SET_ACTIVE_PER_JOB, cursor });
    for (const chunk of page.page) {
      if (chunk.active !== active) await ctx.db.patch(chunk._id, { active });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        SET_ACTIVE_PAUSE_MS,
        internal.knowledge.indexing.setActive,
        { documentId, active, cursor: page.continueCursor, next },
      );
    } else if (next) {
      await ctx.scheduler.runAfter(
        SET_ACTIVE_PAUSE_MS,
        internal.knowledge.indexing.setActive,
        { documentId: next.documentId, active: next.active, cursor: null },
      );
    }
  },
});

export const deleteChunks = internalMutation({
  args: { documentId: v.id("knowledgeDocuments") },
  handler: async (ctx, { documentId }) => {
    const rows = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .take(CHUNKS_PER_JOB);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === CHUNKS_PER_JOB) {
      await ctx.scheduler.runAfter(
        0,
        internal.knowledge.indexing.deleteChunks,
        {
          documentId,
        },
      );
    }
  },
});
