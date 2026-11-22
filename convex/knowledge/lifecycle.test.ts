import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");
const hr = { role: "hr" } as const;
const checklist = {
  validityScope: "Cały urząd",
  legalBasis: "Art. 1",
  effectiveDate: "2026-02-01",
  publicationDate: "2026-01-01",
  polishLanguage: true,
  publicationConsent: true,
};
const vector = new Array<number>(1024).fill(0.01);

type T = Awaited<ReturnType<typeof setup>>["t"];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const uploadedById = await t.run((ctx) =>
    ctx.db.insert("employees", {
      firstName: "Hanna",
      lastName: "Test",
      position: "Specjalista",
      unit: "Wydział",
      createdAt: 0,
      demoPersona: "hr",
    }),
  );
  return { t, uploadedById };
}

async function addDocument(
  t: T,
  uploadedById: Id<"employees">,
  fields: Record<string, unknown> = {},
  chunks = 2,
) {
  return await t.run(async (ctx) => {
    const documentId = await ctx.db.insert("knowledgeDocuments", {
      title: "Regulamin",
      fileName: "r.md",
      scope: "office",
      status: "indexed",
      pseudonymized: false,
      uploadedById,
      uploadedAt: 0,
      sourceKey: "src",
      version: 1,
      checklist,
      ...fields,
    });
    for (let order = 0; order < chunks; order++) {
      await ctx.db.insert("knowledgeChunks", {
        sourceId: documentId,
        sourceTitle: "Regulamin",
        locator: `§ ${order + 1}`,
        text: `Treść ${order}`,
        order,
        documentId,
        scope: "office",
        active: false,
        embedding: vector,
      });
    }
    return documentId;
  });
}

async function activeCount(t: T, documentId: Id<"knowledgeDocuments">) {
  return await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .collect();
    return rows.filter((row) => row.active).length;
  });
}

describe("publish, withdraw, remove", () => {
  it("publishes only an indexed document with a complete checklist", async () => {
    const { t, uploadedById } = await setup();
    const queued = await addDocument(t, uploadedById, { status: "queued" });
    await expect(
      t.mutation(api.knowledge.documents.publish, {
        actor: hr,
        documentId: queued,
      }),
    ).rejects.toThrow(/gotowy/);
    const incomplete = await addDocument(t, uploadedById, {
      checklist: { ...checklist, publicationConsent: false },
    });
    await expect(
      t.mutation(api.knowledge.documents.publish, {
        actor: hr,
        documentId: incomplete,
      }),
    ).rejects.toThrow(/listę kontrolną/);
    const bare = await addDocument(t, uploadedById, { checklist: undefined });
    await expect(
      t.mutation(api.knowledge.documents.publish, {
        actor: hr,
        documentId: bare,
      }),
    ).rejects.toThrow(/listę kontrolną/);
  });

  it("activates the new version and deactivates the previous one", async () => {
    const { t, uploadedById } = await setup();
    const v1 = await addDocument(t, uploadedById);
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: v1,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await activeCount(t, v1)).toBe(2);

    const v2 = await addDocument(t, uploadedById, {
      version: 2,
      supersedesId: v1,
    });
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: v2,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await activeCount(t, v2)).toBe(2);
    expect(await activeCount(t, v1)).toBe(0);
    const [first, second] = await t.run(async (ctx) => [
      await ctx.db.get(v1),
      await ctx.db.get(v2),
    ]);
    expect(first?.status).toBe("indexed");
    expect(first?.publishedAt).toBeUndefined();
    expect(second?.publishedAt).toBeTypeOf("number");
    await expect(
      t.mutation(api.knowledge.documents.publish, {
        actor: hr,
        documentId: v2,
      }),
    ).rejects.toThrow(/już opublikowany/);
  });

  it("withdraw brings the previous version back, or leaves nothing active", async () => {
    const { t, uploadedById } = await setup();
    const v1 = await addDocument(t, uploadedById);
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: v1,
    });
    const v2 = await addDocument(t, uploadedById, {
      version: 2,
      supersedesId: v1,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: v2,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await t.mutation(api.knowledge.documents.withdraw, {
      actor: hr,
      documentId: v2,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await activeCount(t, v2)).toBe(0);
    expect(await activeCount(t, v1)).toBe(2);
    const restored = await t.run((ctx) => ctx.db.get(v1));
    expect(restored?.publishedAt).toBeTypeOf("number");
    expect((await t.run((ctx) => ctx.db.get(v2)))?.status).toBe("withdrawn");

    await t.mutation(api.knowledge.documents.withdraw, {
      actor: hr,
      documentId: v1,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await activeCount(t, v1)).toBe(0);
    await expect(
      t.mutation(api.knowledge.documents.withdraw, {
        actor: hr,
        documentId: v1,
      }),
    ).rejects.toThrow(/już wycofany/);
  });

  it("remove deletes the chunks and the file, and restores the previous version", async () => {
    const { t, uploadedById } = await setup();
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    const v1 = await addDocument(t, uploadedById);
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: v1,
    });
    const v2 = await addDocument(t, uploadedById, {
      version: 2,
      supersedesId: v1,
      storageId,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: v2,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await t.mutation(api.knowledge.documents.remove, {
      actor: hr,
      documentId: v2,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.run((ctx) => ctx.db.get(v2))).toBeNull();
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", storageId)),
    ).toBeNull();
    const left = await t.run((ctx) =>
      ctx.db
        .query("knowledgeChunks")
        .withIndex("by_document", (q) => q.eq("documentId", v2))
        .collect(),
    );
    expect(left).toHaveLength(0);
    expect(await activeCount(t, v1)).toBe(2);
  });

  it("writes an audit entry per step and denies other roles", async () => {
    const { t, uploadedById } = await setup();
    const id = await addDocument(t, uploadedById);
    await t.mutation(api.knowledge.documents.publish, {
      actor: hr,
      documentId: id,
    });
    await t.mutation(api.knowledge.documents.withdraw, {
      actor: hr,
      documentId: id,
    });
    const entries = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(entries.map((entry) => entry.details)).toEqual([
      "publish",
      "withdraw",
    ]);
    await expect(
      t.mutation(api.knowledge.documents.remove, {
        actor: { role: "employee" },
        documentId: id,
      }),
    ).rejects.toMatchObject({ data: { code: "denied" } });
  });
});

describe("versions", () => {
  async function parsed(t: T, id: Id<"knowledgeDocuments">, hash: string) {
    return await t.mutation(internal.knowledge.ingest.saveParsed, {
      documentId: id,
      markdown: "# Tekst",
      contentHash: hash,
    });
  }

  it("does not import the same content twice and numbers changed content", async () => {
    const { t, uploadedById } = await setup();
    const first = await addDocument(
      t,
      uploadedById,
      { status: "indexing", version: undefined },
      0,
    );
    expect(await parsed(t, first, "h1")).toBe("new");
    await t.mutation(internal.knowledge.indexing.markIndexed, {
      documentId: first,
    });

    const same = await addDocument(
      t,
      uploadedById,
      { status: "indexing", version: undefined },
      0,
    );
    expect(await parsed(t, same, "h1")).toBe("duplicate");
    const duplicate = await t.run((ctx) => ctx.db.get(same));
    expect(duplicate?.status).toBe("failed");
    expect(duplicate?.error).toMatch(/już zaimportowany/);

    const changed = await addDocument(
      t,
      uploadedById,
      { status: "indexing", version: undefined },
      0,
    );
    expect(await parsed(t, changed, "h2")).toBe("new");
    expect(await t.run((ctx) => ctx.db.get(changed))).toMatchObject({
      version: 2,
      supersedesId: first,
    });
  });
});

describe("embedding", () => {
  async function indexingDocument(chunkCount: number) {
    const { t, uploadedById } = await setup();
    const id = await addDocument(t, uploadedById, { status: "indexing" }, 0);
    await t.run(async (ctx) => {
      for (let order = 0; order < chunkCount; order++) {
        await ctx.db.insert("knowledgeChunks", {
          sourceId: id,
          sourceTitle: "Regulamin",
          locator: `§ ${order}`,
          text: `Treść numer ${order}`,
          order,
          documentId: id,
          scope: "office",
          active: false,
        });
      }
    });
    return { t, id };
  }

  it("embeds every chunk in batches and marks the document indexed", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    const { t, id } = await indexingDocument(70);
    await t.action(internal.knowledge.indexing.embedDocument, {
      documentId: id,
      after: 0,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const rows = await t.run((ctx) =>
      ctx.db
        .query("knowledgeChunks")
        .withIndex("by_document", (q) => q.eq("documentId", id))
        .collect(),
    );
    expect(rows).toHaveLength(70);
    expect(rows.every((row) => row.embedding?.length === 1024)).toBe(true);
    expect(rows.every((row) => row.active === false)).toBe(true);
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc?.status).toBe("indexed");
    expect(doc?.embeddingModel).toBeTruthy();
    expect(doc?.indexedAt).toBeTypeOf("number");
  });

  it("marks the document failed with a readable message when the provider fails", async () => {
    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    const { t, id } = await indexingDocument(3);
    await t.action(internal.knowledge.indexing.embedDocument, {
      documentId: id,
      after: 0,
    });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc?.status).toBe("failed");
    expect(doc?.error).toMatch(/Nie udało się przygotować dokumentu/);
  });

  it("stops when the document is no longer being indexed", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    const { t, id } = await indexingDocument(3);
    await t.run((ctx) => ctx.db.patch(id, { status: "withdrawn" }));
    await t.action(internal.knowledge.indexing.embedDocument, {
      documentId: id,
      after: 0,
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.status).toBe("withdrawn");
  });
});

describe("list and stale documents", () => {
  it("counts the chunks of an indexed document without reading them all", async () => {
    const { t, uploadedById } = await setup();
    await addDocument(t, uploadedById, {}, 5);
    await addDocument(t, uploadedById, { status: "indexing" }, 3);
    const rows = await t.query(api.knowledge.documents.list, { actor: hr });
    expect(rows.map((row) => [row.status, row.chunkCount]).sort()).toEqual([
      ["indexed", 5],
      ["indexing", 0],
    ]);
    expect(JSON.stringify(rows)).not.toContain("embedding");
  });

  it("fails documents stuck in queued or indexing and leaves fresh ones", async () => {
    const { t, uploadedById } = await setup();
    const stuck = await addDocument(
      t,
      uploadedById,
      { status: "indexing", uploadedAt: 0 },
      0,
    );
    const queued = await addDocument(
      t,
      uploadedById,
      { status: "queued", uploadedAt: 0 },
      0,
    );
    const fresh = await addDocument(
      t,
      uploadedById,
      { status: "indexing", uploadedAt: Date.now() },
      0,
    );
    await t.mutation(internal.knowledge.ingest.failStale, {});
    const status = (id: Id<"knowledgeDocuments">) =>
      t.run(async (ctx) => (await ctx.db.get(id))?.status);
    expect(await status(stuck)).toBe("failed");
    expect(await status(queued)).toBe("failed");
    expect(await status(fresh)).toBe("indexing");
    const doc = await t.run((ctx) => ctx.db.get(stuck));
    expect(doc?.error).toMatch(/przerwane/);
  });
});
