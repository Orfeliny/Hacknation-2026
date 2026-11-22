import { ConvexError, v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { SEED_SOURCES, type SeedSource } from "./sources";

// The demo HR account: the seed goes through the same functions as an import by HR, so validation,
// the audit entry and the version rules are the same.
const HR = { role: "hr" } as const;
const POLL_MS = 60_000;
const MAX_ATTEMPTS = 240;
const LIVE = new Set(["queued", "indexing", "indexed"]);

export type SeedSummary = {
  registered: number;
  skipped: number;
  failures: string[];
  error?: string;
};

export type PublishSummary = {
  published: number;
  pending: number;
  failed: number;
};

function isDenied(error: unknown): boolean {
  if (!(error instanceof ConvexError)) return false;
  const data: unknown = error.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "denied"
  );
}

function checklistFor(source: SeedSource, today: string) {
  return {
    validityScope: "Cała administracja rządowa (zakres ogólnopolski)",
    legalBasis: source.legalBasis,
    effectiveDate: source.effectiveDate ?? today,
    publicationDate: source.publicationDate ?? today,
    polishLanguage: true,
    publicationConsent: true,
  };
}

const hrefOf = (url: string) => new URL(url).href;

// Registers every source that is not there yet, then waits for indexing to publish. Safe to run
// again: a source that is queued, indexing or indexed is skipped.
export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedSummary> => {
    const summary: SeedSummary = { registered: 0, skipped: 0, failures: [] };
    let rows;
    try {
      rows = await ctx.runQuery(api.knowledge.documents.list, { actor: HR });
    } catch (error) {
      if (!isDenied(error)) throw error;
      return {
        ...summary,
        error:
          "Brak konta kadr (demoPersona hr). Najpierw wczytaj dane demo: employees/seed:run.",
      };
    }
    const present = new Set(
      rows
        .filter((row) => row.sourceUrl && LIVE.has(row.status))
        .map((row) => row.sourceUrl),
    );
    const today = new Date().toISOString().slice(0, 10);
    for (const source of SEED_SOURCES) {
      if (present.has(hrefOf(source.url))) {
        summary.skipped += 1;
        continue;
      }
      try {
        await ctx.runMutation(api.knowledge.documents.registerUrl, {
          actor: HR,
          url: source.url,
          title: source.title,
          scope: "national",
          checklist: checklistFor(source, today),
        });
        summary.registered += 1;
      } catch (error) {
        summary.failures.push(
          `${source.title}: ${error instanceof ConvexError ? String(error.data) : "błąd"}`,
        );
      }
    }
    await ctx.scheduler.runAfter(0, internal.knowledge.seed.publishReady, {
      attempt: 0,
    });
    return summary;
  },
});

// Publishes the seeded documents that finished indexing and checks again until none is pending.
export const publishReady = internalAction({
  args: { attempt: v.number() },
  handler: async (ctx, { attempt }): Promise<PublishSummary> => {
    await ctx.runMutation(internal.knowledge.ingest.failStale, {});
    const urls = new Set(SEED_SOURCES.map((source) => hrefOf(source.url)));
    const rows = await ctx.runQuery(api.knowledge.documents.list, {
      actor: HR,
    });
    const seeded = rows.filter(
      (row) => row.sourceUrl && urls.has(row.sourceUrl),
    );
    const summary: PublishSummary = { published: 0, pending: 0, failed: 0 };
    const covered = new Set<string>();
    for (const row of seeded) {
      if (row.sourceUrl && LIVE.has(row.status)) covered.add(row.sourceUrl);
      if (row.status === "failed" || row.status === "needs_fix") {
        summary.failed += 1;
      } else if (row.status === "indexed" && row.publishedAt === undefined) {
        try {
          await ctx.runMutation(api.knowledge.documents.publish, {
            actor: HR,
            documentId: row.documentId,
          });
          summary.published += 1;
        } catch {
          summary.failed += 1;
        }
      } else if (row.status === "queued" || row.status === "indexing") {
        summary.pending += 1;
      }
    }
    summary.pending += urls.size - covered.size;
    if (summary.pending > 0 && attempt < MAX_ATTEMPTS) {
      await ctx.scheduler.runAfter(
        POLL_MS,
        internal.knowledge.seed.publishReady,
        { attempt: attempt + 1 },
      );
    }
    return summary;
  },
});
