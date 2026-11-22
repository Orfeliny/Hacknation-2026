/// <reference types="node" />
"use node";

import { lookup } from "node:dns/promises";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { chunkMarkdown } from "./chunk";
import { ConvertError, convertToMarkdown } from "./convert";
import { fetchSource, SourceError } from "./fetchSource";
import { sha256Hex } from "./hash";
import { eliFromUrl } from "./urlSafety";
import { fileKindOf, type DocumentKind } from "./validation";

const CHUNKS_PER_MUTATION = 100;

async function resolveHost(host: string): Promise<string[]> {
  const records = await lookup(host, { all: true });
  return records.map((record) => record.address);
}

export const parseDocument = internalAction({
  args: { documentId: v.id("knowledgeDocuments") },
  handler: async (ctx, { documentId }) => {
    const claimed = await ctx.runMutation(internal.knowledge.ingest.claim, {
      documentId,
    });
    if (!claimed) return;
    const doc = await ctx.runQuery(internal.knowledge.ingest.getForParsing, {
      documentId,
    });
    if (!doc) return;
    try {
      let bytes: Uint8Array;
      let kind: DocumentKind;
      if (doc.storageId) {
        const blob = await ctx.storage.get(doc.storageId);
        if (!blob) throw new SourceError("Nie znaleziono wgranego pliku.");
        bytes = new Uint8Array(await blob.arrayBuffer());
        kind = fileKindOf(doc.fileName);
      } else if (doc.sourceUrl) {
        const eli = eliFromUrl(new URL(doc.sourceUrl));
        const fetched = await fetchSource(eli?.textUrl ?? doc.sourceUrl, {
          resolve: resolveHost,
        });
        bytes = fetched.bytes;
        kind = sourceKind(fetched.contentType, fetched.finalUrl, Boolean(eli));
      } else {
        throw new SourceError("Dokument nie ma pliku ani adresu.");
      }
      const markdown = await convertToMarkdown(kind, bytes);
      const saved = await ctx.runMutation(
        internal.knowledge.ingest.saveParsed,
        { documentId, markdown, contentHash: await sha256Hex(markdown) },
      );
      if (saved !== "new") return;
      const chunks = chunkMarkdown(markdown, doc.title);
      if (chunks.length === 0) {
        throw new ConvertError("Dokument nie zawiera tekstu.");
      }
      for (let i = 0; i < chunks.length; i += CHUNKS_PER_MUTATION) {
        const slice = await Promise.all(
          chunks.slice(i, i + CHUNKS_PER_MUTATION).map(async (chunk) => ({
            ...chunk,
            contentHash: await sha256Hex(chunk.text),
          })),
        );
        await ctx.runMutation(internal.knowledge.ingest.insertChunks, {
          documentId,
          chunks: slice,
        });
      }
      await ctx.scheduler.runAfter(
        0,
        internal.knowledge.indexing.embedDocument,
        { documentId, after: 0 },
      );
    } catch (error) {
      const known =
        error instanceof ConvertError || error instanceof SourceError;
      // Only the error name is logged: messages can carry document content.
      if (!known)
        console.error("knowledge parse failed", (error as Error).name);
      await ctx.runMutation(internal.knowledge.ingest.fail, {
        documentId,
        status: needsFix(error) ? "needs_fix" : "failed",
        error: known
          ? error.message
          : "Nie udało się przetworzyć dokumentu. Sprawdź, czy plik nie jest uszkodzony.",
      });
    }
  },
});

function needsFix(error: unknown): boolean {
  return (
    error instanceof ConvertError ||
    (error instanceof SourceError && error.status === "needs_fix")
  );
}

function sourceKind(
  contentType: string,
  finalUrl: string,
  isEli: boolean,
): DocumentKind {
  if (isEli) return "html";
  const type = contentType.toLowerCase();
  if (type.includes("pdf")) return "pdf";
  if (type.includes("wordprocessingml")) return "docx";
  if (type.includes("markdown")) return "markdown";
  if (type.includes("html")) return "html";
  try {
    return fileKindOf(new URL(finalUrl).pathname);
  } catch {
    throw new SourceError(
      "Nieobsługiwany typ dokumentu pod tym adresem. Dozwolone: PDF, DOCX, HTML i Markdown.",
      "needs_fix",
    );
  }
}
