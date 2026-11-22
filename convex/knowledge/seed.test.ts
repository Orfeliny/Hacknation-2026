import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { pageContent } from "./pageContent";
import { SEED_ELI_IDS, SEED_SOURCES } from "./sources";
import { eliFromUrl } from "./urlSafety";

const modules = import.meta.glob("/convex/**/*.*s");

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function setup(withHr = true) {
  const t = convexTest(schema, modules);
  if (withHr) {
    await t.run((ctx) =>
      ctx.db.insert("employees", {
        firstName: "Hanna",
        lastName: "Test",
        position: "Specjalista",
        unit: "Wydział",
        createdAt: 0,
        demoPersona: "hr",
      }),
    );
  }
  return t;
}

const allDocuments = (t: Awaited<ReturnType<typeof setup>>) =>
  t.run((ctx) => ctx.db.query("knowledgeDocuments").collect());

describe("starter sources", () => {
  it("lists 15 acts and 2 pages, every one over https and unique", () => {
    expect(SEED_SOURCES).toHaveLength(17);
    expect(SEED_SOURCES.filter((s) => s.kind === "act")).toHaveLength(15);
    const urls = SEED_SOURCES.map((s) => s.url);
    expect(new Set(urls).size).toBe(17);
    expect(urls.every((url) => url.startsWith("https://"))).toBe(true);
  });

  it("reads every act as an ELI act", () => {
    expect(SEED_ELI_IDS).toHaveLength(15);
    for (const source of SEED_SOURCES.filter((s) => s.kind === "act")) {
      expect(eliFromUrl(new URL(source.url))?.textUrl).toBe(source.url);
    }
  });
});

describe("seed", () => {
  it("registers every source as a national document with a complete checklist", async () => {
    const t = await setup();
    const summary = await t.action(internal.knowledge.seed.run, {});
    expect(summary).toMatchObject({ registered: 17, skipped: 0, failures: [] });
    const docs = await allDocuments(t);
    expect(docs).toHaveLength(17);
    expect(docs.every((d) => d.scope === "national")).toBe(true);
    expect(docs.every((d) => d.status === "queued")).toBe(true);
    expect(docs.every((d) => d.checklist?.publicationConsent === true)).toBe(
      true,
    );
    expect(docs.filter((d) => d.eliId)).toHaveLength(15);
  });

  it("does not duplicate on a second run", async () => {
    const t = await setup();
    await t.action(internal.knowledge.seed.run, {});
    const again = await t.action(internal.knowledge.seed.run, {});
    expect(again).toMatchObject({ registered: 0, skipped: 17 });
    expect(await allDocuments(t)).toHaveLength(17);
  });

  it("retries a source that failed", async () => {
    const t = await setup();
    await t.action(internal.knowledge.seed.run, {});
    const first = (await allDocuments(t)).at(0);
    if (!first) throw new Error("no documents");
    await t.run((ctx) =>
      ctx.db.patch(first._id, { status: "failed", error: "Błąd pobierania" }),
    );
    const again = await t.action(internal.knowledge.seed.run, {});
    expect(again).toMatchObject({ registered: 1, skipped: 16 });
  });

  it("says what is missing when there is no HR account", async () => {
    const t = await setup(false);
    const summary = await t.action(internal.knowledge.seed.run, {});
    expect(summary.registered).toBe(0);
    expect(summary.error).toMatch(/employees\/seed:run/);
  });

  it("publishes only the documents that finished indexing and counts the rest as pending", async () => {
    const t = await setup();
    await t.action(internal.knowledge.seed.run, {});
    const docs = await allDocuments(t);
    const ready = docs.slice(0, 2);
    for (const doc of ready) {
      await t.run((ctx) => ctx.db.patch(doc._id, { status: "indexed" }));
    }
    const summary = await t.action(internal.knowledge.seed.publishReady, {
      attempt: 0,
    });
    expect(summary).toEqual({ published: 2, pending: 15, failed: 0 });
    const published = (await allDocuments(t)).filter((d) => d.publishedAt);
    expect(published).toHaveLength(2);
    const again = await t.action(internal.knowledge.seed.publishReady, {
      attempt: 0,
    });
    expect(again).toEqual({ published: 0, pending: 15, failed: 0 });
  });
});

describe("pageContent", () => {
  it("keeps the main text and drops menus and footers", () => {
    const html = `<header>Menu</header><nav>Linki</nav>
      <main><h1>Ocena okresowa</h1><nav>Okruszki</nav><p>Treść strony.</p></main>
      <footer>Stopka</footer>`;
    const result = pageContent(html);
    expect(result).toContain("Treść strony.");
    expect(result).not.toMatch(/Menu|Linki|Okruszki|Stopka/);
  });

  it("falls back to the whole page without <main>", () => {
    const result = pageContent(
      "<nav>Menu</nav><p>Tekst</p><footer>Stopka</footer>",
    );
    expect(result).toBe("<p>Tekst</p>");
  });
});
