import { v, type Infer } from "convex/values";
import { demoActor } from "../demoRole";

// B4 Internal documents. Backend: convex/knowledge/{documents,assistant}.ts. Tables:
// `knowledgeDocuments` and an optional `documentId` on `knowledgeChunks` (index `by_document`).
// Access for the whole package: the office's HR manages documents, every role may ask.

export const KNOWLEDGE_LIMITS = {
  title: 200,
  fileName: 255,
  unit: 120,
  question: 1000,
} as const;

export const knowledgeDocumentScope = v.union(
  v.literal("office"),
  v.literal("unit"),
);

export const knowledgeDocumentStatus = v.union(
  v.literal("queued"),
  v.literal("indexing"),
  v.literal("indexed"),
  v.literal("failed"),
);

export const knowledgeDocumentRow = v.object({
  documentId: v.id("knowledgeDocuments"),
  title: v.string(),
  fileName: v.string(),
  scope: knowledgeDocumentScope,
  unit: v.optional(v.string()),
  status: knowledgeDocumentStatus,
  error: v.optional(v.string()),
  pseudonymized: v.boolean(),
  uploadedByName: v.string(),
  uploadedAt: v.number(),
  indexedAt: v.optional(v.number()),
  chunkCount: v.number(),
});

export const knowledgeCitation = v.object({
  kind: v.union(v.literal("office"), v.literal("law")),
  title: v.string(),
  locator: v.string(),
  documentId: v.optional(v.id("knowledgeDocuments")),
});

// Access: hr.
export const listDocumentsContract = {
  args: { actor: demoActor },
  returns: v.array(knowledgeDocumentRow),
};

// Access: hr. Upload URL of Convex file storage.
export const generateUploadUrlContract = {
  args: { actor: demoActor },
  returns: v.string(),
};

// Access: hr. Creates the row with status `queued`; `unit` is required for scope `unit`.
export const registerDocumentContract = {
  args: {
    actor: demoActor,
    storageId: v.id("_storage"),
    title: v.string(),
    fileName: v.string(),
    scope: knowledgeDocumentScope,
    unit: v.optional(v.string()),
  },
  returns: v.id("knowledgeDocuments"),
};

// Access: hr. Also deletes the document's chunks through `by_document` and the stored file.
export const removeDocumentContract = {
  args: { actor: demoActor, documentId: v.id("knowledgeDocuments") },
  returns: v.null(),
};

// Access: every role. An action, so it resolves the actor through an internal query. `answer` is
// `null` when nothing in the sources supports one. A `unit` document is cited only to its unit.
export const askContract = {
  args: { actor: demoActor, question: v.string() },
  returns: v.object({
    answer: v.union(v.string(), v.null()),
    citations: v.array(knowledgeCitation),
  }),
};

export type KnowledgeDocumentRow = Infer<typeof knowledgeDocumentRow>;
export type KnowledgeCitation = Infer<typeof knowledgeCitation>;
