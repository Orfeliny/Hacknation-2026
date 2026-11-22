import { v, type Infer } from "convex/values";
import { demoActor } from "../demoRole";

// B4 Internal documents and the knowledge base (RAG, issue #86, specs/knowledge-rag.md).
// Backend: convex/knowledge/{documents,assistant}.ts. Tables: `knowledgeDocuments` and
// `knowledgeChunks` (indexes `by_document`, `by_embedding`).
// Access for the whole package: the office's HR manages documents, every role may ask.
//
// The shape here is the first B4 contract (#89) extended additively for #86: `national` scope,
// `needs_fix` / `withdrawn` statuses, URL import, a publish / withdraw step, a parsed preview,
// versions and a checklist. Everything new is optional, so the first shape still validates.

export const KNOWLEDGE_LIMITS = {
  title: 200,
  fileName: 255,
  unit: 120,
  question: 1000,
  description: 1000,
  url: 2048,
  checklistText: 300,
  // Characters of parsed Markdown kept on the document for the preview; the full text lives in chunks.
  previewChars: 20000,
  maxFileBytes: 20 * 1024 * 1024,
} as const;

// `national` is the shared base for every office, `office` the whole office, `unit` one unit.
export const knowledgeDocumentScope = v.union(
  v.literal("national"),
  v.literal("office"),
  v.literal("unit"),
);

// queued = oczekuje, indexing = przetwarzanie, indexed = gotowe, failed = błąd,
// needs_fix = do poprawy (e.g. empty text or a scan), withdrawn = wycofany.
export const knowledgeDocumentStatus = v.union(
  v.literal("queued"),
  v.literal("indexing"),
  v.literal("indexed"),
  v.literal("failed"),
  v.literal("needs_fix"),
  v.literal("withdrawn"),
);

export const knowledgeSourceKind = v.union(v.literal("file"), v.literal("url"));

// What HR confirms before a document is published. Dates are ISO `YYYY-MM-DD`.
export const knowledgeChecklist = v.object({
  validityScope: v.string(),
  legalBasis: v.string(),
  effectiveDate: v.string(),
  publicationDate: v.string(),
  polishLanguage: v.boolean(),
  publicationConsent: v.boolean(),
});

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
  description: v.optional(v.string()),
  sourceKind: v.optional(knowledgeSourceKind),
  sourceUrl: v.optional(v.string()),
  version: v.optional(v.number()),
  eliId: v.optional(v.string()),
  checklist: v.optional(knowledgeChecklist),
  // Set while this version is the one the assistant searches.
  publishedAt: v.optional(v.number()),
});

export const knowledgeCitation = v.object({
  kind: v.union(v.literal("office"), v.literal("law")),
  title: v.string(),
  locator: v.string(),
  documentId: v.optional(v.id("knowledgeDocuments")),
  excerpt: v.optional(v.string()),
});

export const knowledgePreview = v.object({
  documentId: v.id("knowledgeDocuments"),
  markdown: v.string(),
  truncated: v.boolean(),
  chunkCount: v.number(),
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

// Access: hr. Creates the row with status `queued`; `unit` is required for scope `unit`. The file
// is at most KNOWLEDGE_LIMITS.maxFileBytes and one of PDF, DOCX, HTML, Markdown (`.doc` is refused
// with "zapisz jako DOCX").
export const registerDocumentContract = {
  args: {
    actor: demoActor,
    storageId: v.id("_storage"),
    title: v.string(),
    fileName: v.string(),
    scope: knowledgeDocumentScope,
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
    checklist: v.optional(knowledgeChecklist),
  },
  returns: v.id("knowledgeDocuments"),
};

// Access: hr. Same as `register` for a link (https only, no private hosts); the server fetches it.
// An eli.gov.pl link is read through the ELI API and keeps `eliId`. `fileName` of the row is taken
// from the last path segment of the link.
export const registerUrlContract = {
  args: {
    actor: demoActor,
    url: v.string(),
    title: v.string(),
    scope: knowledgeDocumentScope,
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
    checklist: v.optional(knowledgeChecklist),
  },
  returns: v.id("knowledgeDocuments"),
};

// Access: hr. The parsed Markdown (capped at KNOWLEDGE_LIMITS.previewChars) to review before publishing.
export const getPreviewContract = {
  args: { actor: demoActor, documentId: v.id("knowledgeDocuments") },
  returns: knowledgePreview,
};

// Access: hr. Only a document with status `indexed` and a complete checklist. Makes its chunks
// searchable and deactivates the chunks of the previous version of the same source. That earlier
// row keeps status `indexed` and loses `publishedAt`, so exactly one version per source is published.
// A complete checklist means every text field is non-empty and `polishLanguage` and
// `publicationConsent` are true.
export const publishDocumentContract = {
  args: { actor: demoActor, documentId: v.id("knowledgeDocuments") },
  returns: v.null(),
};

// Access: hr. Sets status `withdrawn`, deactivates the chunks and re-activates the previous
// version of the same source when there is one. Chunks and history are kept.
export const withdrawDocumentContract = {
  args: { actor: demoActor, documentId: v.id("knowledgeDocuments") },
  returns: v.null(),
};

// Access: hr. Also deletes the document's chunks through `by_document` and the stored file.
export const removeDocumentContract = {
  args: { actor: demoActor, documentId: v.id("knowledgeDocuments") },
  returns: v.null(),
};

// Access: every role. An action, so it resolves the actor through an internal query. `answer` is
// `null` when nothing in the sources supports one ("Nie znalazłem tego w bazie wiedzy"). A `unit`
// document is cited only to its unit. `possibleConflict` is set when a national and an office or
// unit source both match: the answer lists both and asks for a manual check.
export const askContract = {
  args: { actor: demoActor, question: v.string() },
  returns: v.object({
    answer: v.union(v.string(), v.null()),
    citations: v.array(knowledgeCitation),
    possibleConflict: v.optional(v.boolean()),
  }),
};

export type KnowledgeDocumentRow = Infer<typeof knowledgeDocumentRow>;
export type KnowledgeCitation = Infer<typeof knowledgeCitation>;
export type KnowledgeChecklist = Infer<typeof knowledgeChecklist>;
export type KnowledgePreview = Infer<typeof knowledgePreview>;
