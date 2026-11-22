import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
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
import {
  assertFileSize,
  checklistComplete,
  parseFileInput,
  parseUrlInput,
} from "./validation";

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

async function loadDocument(
  ctx: QueryCtx | MutationCtx,
  documentId: Id<"knowledgeDocuments">,
) {
  const doc = await ctx.db.get(documentId);
  if (!doc) throw new ConvexError("Nie znaleziono dokumentu.");
  return doc;
}

// The nearest earlier version that finished indexing: it is the one to bring back when this one goes.
async function previousVersion(
  ctx: QueryCtx | MutationCtx,
  doc: Doc<"knowledgeDocuments">,
) {
  let id = doc.supersedesId;
  for (let hops = 0; id && hops < 50; hops++) {
    const earlier = await ctx.db.get(id);
    if (!earlier) return null;
    if (earlier.status === "indexed") return earlier;
    id = earlier.supersedesId;
  }
  return null;
}

async function audit(
  ctx: MutationCtx,
  actor: Awaited<ReturnType<typeof requireHr>>,
  documentId: Id<"knowledgeDocuments">,
  details: string,
) {
  await logAudit(ctx, {
    actor,
    action: "update",
    entity: "knowledgeDocument",
    entityId: documentId,
    details,
  });
}

// Takes `doc` out of search; the previous version, if any, takes its place.
async function retire(ctx: MutationCtx, doc: Doc<"knowledgeDocuments">) {
  if (doc.publishedAt === undefined) return;
  const restored = await previousVersion(ctx, doc);
  if (restored) await ctx.db.patch(restored._id, { publishedAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.knowledge.indexing.setActive, {
    documentId: doc._id,
    active: false,
    cursor: null,
    next: restored ? { documentId: restored._id, active: true } : undefined,
  });
}

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
    assertFileSize(stored.size);
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

export const publish = mutation({
  ...publishDocumentContract,
  handler: async (ctx, { actor, documentId }) => {
    const hr = await requireHr(ctx, actor);
    const doc = await loadDocument(ctx, documentId);
    if (doc.status !== "indexed") {
      throw new ConvexError(
        "Opublikować można tylko dokument o statusie „gotowy” (przetworzony).",
      );
    }
    if (doc.publishedAt !== undefined) {
      throw new ConvexError("Ten dokument jest już opublikowany.");
    }
    if (!checklistComplete(doc.checklist)) {
      throw new ConvexError(
        "Uzupełnij listę kontrolną: wszystkie pola, daty oraz zgody na publikację i język polski.",
      );
    }
    const siblings = doc.sourceKey
      ? await ctx.db
          .query("knowledgeDocuments")
          .withIndex("by_source_key", (q) => q.eq("sourceKey", doc.sourceKey))
          .take(200)
      : [];
    const published = siblings.find(
      (other) => other._id !== doc._id && other.publishedAt !== undefined,
    );
    await ctx.db.patch(doc._id, { publishedAt: Date.now() });
    if (published)
      await ctx.db.patch(published._id, { publishedAt: undefined });
    await ctx.scheduler.runAfter(0, internal.knowledge.indexing.setActive, {
      documentId: doc._id,
      active: true,
      cursor: null,
      next: published
        ? { documentId: published._id, active: false }
        : undefined,
    });
    await audit(ctx, hr, doc._id, "publish");
    return null;
  },
});

export const withdraw = mutation({
  ...withdrawDocumentContract,
  handler: async (ctx, { actor, documentId }) => {
    const hr = await requireHr(ctx, actor);
    const doc = await loadDocument(ctx, documentId);
    if (doc.status === "withdrawn") {
      throw new ConvexError("Ten dokument jest już wycofany.");
    }
    await retire(ctx, doc);
    await ctx.db.patch(doc._id, {
      status: "withdrawn",
      publishedAt: undefined,
    });
    await audit(ctx, hr, doc._id, "withdraw");
    return null;
  },
});

export const remove = mutation({
  ...removeDocumentContract,
  handler: async (ctx, { actor, documentId }) => {
    const hr = await requireHr(ctx, actor);
    const doc = await loadDocument(ctx, documentId);
    await retire(ctx, doc);
    if (doc.storageId) await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(doc._id);
    await ctx.scheduler.runAfter(0, internal.knowledge.indexing.deleteChunks, {
      documentId: doc._id,
    });
    await audit(ctx, hr, doc._id, "remove");
    return null;
  },
});
