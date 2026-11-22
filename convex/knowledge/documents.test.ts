import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
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

async function setup() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (const [role, firstName] of [
      ["hr", "Hanna"],
      ["employee", "Ewa"],
    ] as const) {
      await ctx.db.insert("employees", {
        firstName,
        lastName: "Test",
        position: "Specjalista",
        unit: "Wydział",
        createdAt: 0,
        demoPersona: role,
      });
    }
  });
  return t;
}

async function upload(t: Awaited<ReturnType<typeof setup>>, size = 10) {
  return await t.run((ctx) => ctx.storage.store(new Blob(["a".repeat(size)])));
}

describe("knowledge import", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("denies roles other than hr and admin", async () => {
    const t = await setup();
    await expect(
      t.query(api.knowledge.documents.list, { actor: { role: "employee" } }),
    ).rejects.toMatchObject({ data: { code: "denied" } });
    await expect(
      t.mutation(api.knowledge.documents.generateUploadUrl, {
        actor: { role: "supervisor" },
      }),
    ).rejects.toMatchObject({ data: { code: "denied" } });
  });

  it("registers a file as queued, schedules parsing and lists it without embeddings", async () => {
    const t = await setup();
    const storageId = await upload(t);
    const id = await t.mutation(api.knowledge.documents.register, {
      actor: hr,
      storageId,
      title: "Regulamin pracy",
      fileName: "regulamin.md",
      scope: "office",
      checklist,
    });
    const rows = await t.query(api.knowledge.documents.list, { actor: hr });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      documentId: id,
      status: "queued",
      sourceKind: "file",
      uploadedByName: "Hanna Test",
      chunkCount: 0,
    });
    expect(JSON.stringify(rows)).not.toContain("embedding");
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit).toMatchObject([
      { action: "create", entity: "knowledgeDocument", entityId: id },
    ]);
  });

  it("refuses .doc, a missing unit and an oversized file", async () => {
    const t = await setup();
    const storageId = await upload(t);
    const args = {
      actor: hr,
      storageId,
      title: "Dokument",
      fileName: "a.doc",
      scope: "office" as const,
    };
    await expect(
      t.mutation(api.knowledge.documents.register, args),
    ).rejects.toThrow(/zapisz dokument jako DOCX/);
    await expect(
      t.mutation(api.knowledge.documents.register, {
        ...args,
        fileName: "a.pdf",
        scope: "unit",
      }),
    ).rejects.toThrow(/jednostk/);
    const big = await upload(t, 20 * 1024 * 1024 + 1);
    await expect(
      t.mutation(api.knowledge.documents.register, {
        ...args,
        fileName: "a.pdf",
        storageId: big,
      }),
    ).rejects.toThrow(/za duży/);
  });

  it("registers an ELI link with its id and a link-based file name", async () => {
    const t = await setup();
    const id = await t.mutation(api.knowledge.documents.registerUrl, {
      actor: hr,
      url: "https://eli.gov.pl/api/acts/DU/2016/470/text.html",
      title: "Ustawa",
      scope: "national",
    });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc).toMatchObject({
      status: "queued",
      sourceKind: "url",
      eliId: "DU/2016/470",
      fileName: "text.html",
    });
    await expect(
      t.mutation(api.knowledge.documents.registerUrl, {
        actor: hr,
        url: "http://eli.gov.pl/x",
        title: "Ustawa",
        scope: "national",
      }),
    ).rejects.toThrow(/https/);
  });

  it("returns the preview with the truncation flag", async () => {
    const t = await setup();
    const id = await t.mutation(api.knowledge.documents.registerUrl, {
      actor: hr,
      url: "https://example.com/a.pdf",
      title: "Pismo",
      scope: "office",
    });
    await t.run((ctx) => ctx.db.patch(id, { markdown: "# Tytuł" }));
    expect(
      await t.query(api.knowledge.documents.getPreview, {
        actor: hr,
        documentId: id,
      }),
    ).toEqual({
      documentId: id,
      markdown: "# Tytuł",
      truncated: false,
      chunkCount: 0,
    });
  });
});
