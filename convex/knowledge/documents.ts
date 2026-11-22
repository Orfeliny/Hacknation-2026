import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { logAudit } from "../audit/log";
import {
  generateUploadUrlContract,
  getPreviewContract,
  KNOWLEDGE_LIMITS,
  listDocumentsContract,
  publishDocumentContract,
  registerDocumentContract,
  registerUrlContract,
  removeDocumentContract,
  withdrawDocumentContract,
} from "../lib/contracts/knowledgeDocs";
import { resolveActor, type DemoActor } from "../lib/demoRole";
import { sha256Hex } from "./hash";
import { eliFromUrl, fileNameFromUrl, normalizeUrl } from "./urlSafety";
import { assertFileSize, parseFileInput, parseUrlInput } from "./validation";

async function requireHr(ctx: QueryCtx | MutationCtx, actor: DemoActor) {
  const resolved = await resolveActor(ctx, actor);
  if (
    (resolved.role !== "hr" && resolved.role !== "admin") ||
    !resolved.employee
  ) {
    throw new ConvexError({
      code: "denied",
      message: "Dokumentami bazy wiedzy zarządza kadry.",
    });
  }
  return { ...resolved, employee: resolved.employee };
}

const sourceKeyOf = (...parts: (string | undefined)[]) =>
  sha256Hex(
    parts
      .map((part) => part ?? "")
      .join("|")
      .toLowerCase(),
  );

async function chunkCount(
  ctx: QueryCtx,
  doc: Doc<"knowledgeDocuments">,
): Promise<number> {
  if (doc.status !== "indexed") return 0;
  // Chunks carry embeddings, so they are only counted for a finished document.
  const chunks = await ctx.db
    .query("knowledgeChunks")
    .withIndex("by_document", (q) => q.eq("documentId", doc._id))
    .collect();
  return chunks.length;
}

export const list = query({
  ...listDocumentsContract,
  handler: async (ctx, { actor }) => {
    await requireHr(ctx, actor);
    const docs = await ctx.db
      .query("knowledgeDocuments")
      .order("desc")
      .take(500);
    return Promise.all(
      docs.map(async (doc) => {
        const uploader = await ctx.db.get(doc.uploadedById);
        return {
          documentId: doc._id,
          title: doc.title,
          fileName: doc.fileName,
          scope: doc.scope,
          unit: doc.unit,
          status: doc.status,
          error: doc.error,
          pseudonymized: doc.pseudonymized,
          uploadedByName: uploader
            ? `${uploader.firstName} ${uploader.lastName}`
            : "",
          uploadedAt: doc.uploadedAt,
          indexedAt: doc.indexedAt,
          chunkCount: await chunkCount(ctx, doc),
          description: doc.description,
          sourceKind: doc.sourceKind,
          sourceUrl: doc.sourceUrl,
          version: doc.version,
          eliId: doc.eliId,
          checklist: doc.checklist,
          publishedAt: doc.publishedAt,
        };
      }),
    );
  },
});

export const getPreview = query({
  ...getPreviewContract,
  handler: async (ctx, { actor, documentId }) => {
    await requireHr(ctx, actor);
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new ConvexError("Nie znaleziono dokumentu.");
    const markdown = doc.markdown ?? "";
    return {
      documentId,
      markdown,
      // The original length is not stored: a preview at the cap is treated as cut.
      truncated: markdown.length >= KNOWLEDGE_LIMITS.previewChars,
      chunkCount: await chunkCount(ctx, doc),
    };
  },
});

export const generateUploadUrl = mutation({
  ...generateUploadUrlContract,
  handler: async (ctx, { actor }) => {
    await requireHr(ctx, actor);
    return await ctx.storage.generateUploadUrl();
  },
});

export const register = mutation({
  ...registerDocumentContract,
  handler: async (ctx, args) => {
    const { employee, ...resolved } = await requireHr(ctx, args.actor);
    const input = parseFileInput(args);
    const stored = await ctx.db.system.get("_storage", args.storageId);
    if (!stored) throw new ConvexError("Nie znaleziono wgranego pliku.");
    try {
      assertFileSize(stored.size);
    } catch (error) {
      await ctx.storage.delete(args.storageId);
      throw error;
    }
    const documentId = await ctx.db.insert("knowledgeDocuments", {
      title: input.title,
      fileName: input.fileName,
      storageId: args.storageId,
      scope: input.scope,
      unit: input.unit,
      status: "queued",
      pseudonymized: false,
      uploadedById: employee._id,
      uploadedAt: Date.now(),
      description: input.description,
      checklist: input.checklist,
      sourceKind: "file",
      sourceKey: await sourceKeyOf(input.title, input.scope, input.unit),
    });
    await ctx.scheduler.runAfter(0, internal.knowledge.parse.parseDocument, {
      documentId,
    });
    await logAudit(ctx, {
      actor: { ...resolved, employee },
      action: "create",
      entity: "knowledgeDocument",
      entityId: documentId,
    });
    return documentId;
  },
});

export const registerUrl = mutation({
  ...registerUrlContract,
  handler: async (ctx, args) => {
    const { employee, ...resolved } = await requireHr(ctx, args.actor);
    const input = parseUrlInput(args);
    const eli = eliFromUrl(input.url);
    const documentId = await ctx.db.insert("knowledgeDocuments", {
      title: input.title,
      fileName: fileNameFromUrl(input.url, KNOWLEDGE_LIMITS.fileName),
      scope: input.scope,
      unit: input.unit,
      status: "queued",
      pseudonymized: false,
      uploadedById: employee._id,
      uploadedAt: Date.now(),
      description: input.description,
      checklist: input.checklist,
      sourceKind: "url",
      sourceUrl: input.url.href,
      eliId: eli?.eliId,
      sourceKey: await sourceKeyOf(eli?.eliId ?? normalizeUrl(input.url)),
    });
    await ctx.scheduler.runAfter(0, internal.knowledge.parse.parseDocument, {
      documentId,
    });
    await logAudit(ctx, {
      actor: { ...resolved, employee },
      action: "create",
      entity: "knowledgeDocument",
      entityId: documentId,
    });
    return documentId;
  },
});

// Stub until RAG-2: publish, withdraw and remove need the chunks.
export const publish = mutation({
  ...publishDocumentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const withdraw = mutation({
  ...withdrawDocumentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const remove = mutation({
  ...removeDocumentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
