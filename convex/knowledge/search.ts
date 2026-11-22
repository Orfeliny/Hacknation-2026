import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalQuery,
  type ActionCtx,
} from "../_generated/server";
import { parseAIConfig } from "../ai/config";
import { getProvider } from "../ai/index";
import { knowledgeDocumentScope } from "../lib/contracts/knowledgeDocs";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

// Cosine score under which a chunk does not count as an answer. Measured on 16 hand-written questions
// about periodic ratings: right articles scored 0.63-0.77, off-topic questions up to 0.48. Tune it on
// the real corpus (issue RAG-6) before trusting it.
export const SCORE_THRESHOLD = 0.55;

// Vector search runs per scope and the inactive chunks of older versions are dropped afterwards (a
// vector filter takes one condition, so `active` cannot be part of it): ask for more than we keep.
const CANDIDATES_PER_SCOPE = 40;
export const MAX_HITS = 6;

export type HitKind = "law" | "office";

export const knowledgeHit = v.object({
  chunkId: v.id("knowledgeChunks"),
  documentId: v.id("knowledgeDocuments"),
  scope: knowledgeDocumentScope,
  kind: v.union(v.literal("law"), v.literal("office")),
  title: v.string(),
  locator: v.string(),
  text: v.string(),
  score: v.number(),
});

export type KnowledgeHit = {
  chunkId: Id<"knowledgeChunks">;
  documentId: Id<"knowledgeDocuments">;
  scope: "national" | "office" | "unit";
  kind: HitKind;
  title: string;
  locator: string;
  text: string;
  score: number;
};

// The chunk rows without their 8 KB embedding, for the chunks that may still be searched: active, of an
// indexed document that is currently published.
export const loadSearchable = internalQuery({
  args: { chunkIds: v.array(v.id("knowledgeChunks")) },
  returns: v.array(
    v.object({
      chunkId: v.id("knowledgeChunks"),
      documentId: v.id("knowledgeDocuments"),
      scope: knowledgeDocumentScope,
      title: v.string(),
      locator: v.string(),
      text: v.string(),
    }),
  ),
  handler: async (ctx, { chunkIds }) => {
    const rows = [];
    for (const chunkId of chunkIds) {
      const chunk = await ctx.db.get(chunkId);
      if (!chunk?.active || !chunk.documentId || !chunk.scope) continue;
      const doc = await ctx.db.get(chunk.documentId);
      if (doc?.status !== "indexed" || doc.publishedAt === undefined) continue;
      rows.push({
        chunkId,
        documentId: chunk.documentId,
        scope: chunk.scope,
        title: doc.title,
        locator: chunk.locator,
        text: chunk.text,
      });
    }
    return rows;
  },
});

export type SearchArgs = {
  question: string;
  // The asker's unit: its own documents are searched next to the national and the office ones.
  unit?: string | undefined;
};

// Embeds the question and searches national, office and (when given) the asker's unit documents. Only
// chunks above SCORE_THRESHOLD come back, best first, at most MAX_HITS.
export async function runSearch(
  ctx: ActionCtx,
  args: SearchArgs,
): Promise<KnowledgeHit[]> {
  const provider = getProvider(parseAIConfig(process.env));
  const { vectors } = await provider.embed({ texts: [args.question] });
  const vector = vectors[0];
  if (!vector) return [];

  const searches = [
    ctx.vectorSearch("knowledgeChunks", "by_embedding", {
      vector,
      limit: CANDIDATES_PER_SCOPE,
      filter: (q) => q.eq("scope", "national"),
    }),
    ctx.vectorSearch("knowledgeChunks", "by_embedding", {
      vector,
      limit: CANDIDATES_PER_SCOPE,
      filter: (q) => q.eq("scope", "office"),
    }),
  ];
  const unit = args.unit;
  if (unit) {
    searches.push(
      ctx.vectorSearch("knowledgeChunks", "by_embedding", {
        vector,
        limit: CANDIDATES_PER_SCOPE,
        filter: (q) => q.eq("unit", unit),
      }),
    );
  }
  const found = (await Promise.all(searches)).flat();
  const scores = new Map(found.map((hit) => [hit._id, hit._score]));
  const strong = [...scores].filter(([, score]) => score >= SCORE_THRESHOLD);
  if (strong.length === 0) return [];

  const rows = await ctx.runQuery(internal.knowledge.search.loadSearchable, {
    chunkIds: strong.map(([chunkId]) => chunkId),
  });
  return rows
    .map((row): KnowledgeHit => ({
      ...row,
      kind: row.scope === "national" ? "law" : "office",
      score: scores.get(row.chunkId) ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HITS);
}

// Reusable by other backend features (the assistant of #14, the drafting of #15): `vectorSearch` only
// exists in actions, so this is an internal action and not the "searchKnowledge" query #20 once named.
export const searchKnowledge = internalAction({
  args: { question: v.string(), unit: v.optional(v.string()) },
  returns: v.array(knowledgeHit),
  handler: (ctx, args): Promise<KnowledgeHit[]> => runSearch(ctx, args),
});
