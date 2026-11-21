import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { ADVICE_TOPICS } from "./constants";
import { SEED_ADVICE } from "./adviceSeedData";

const modules = import.meta.glob("/convex/**/*.*s");

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.growth.adviceSeed.run, {});
  return t;
}

type Db = Awaited<ReturnType<typeof seeded>>;

const list = (t: Db, args = {}) => t.query(api.growth.advice.listAdvice, args);

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

const wordCount = (article: (typeof SEED_ADVICE)[number]) =>
  words(article.title) +
  words(article.summary) +
  article.sections.reduce(
    (sum, s) =>
      sum +
      words(s.heading) +
      s.paragraphs.reduce((a, p) => a + words(p), 0) +
      s.bullets.reduce((a, b) => a + words(b), 0),
    0,
  );

describe("listAdvice", () => {
  it("returns every published article sorted by title, without the sections", async () => {
    const t = await seeded();
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_ADVICE.length);
    const titles = rows.map((r) => r.title);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, "pl")),
    );
    for (const row of rows) expect(row).not.toHaveProperty("sections");
  });

  it("returns an empty list for an empty database", async () => {
    expect(await list(convexTest(schema, modules))).toEqual([]);
  });

  it("filters by topic", async () => {
    const t = await seeded();
    for (const article of SEED_ADVICE) {
      const rows = await list(t, { topic: article.topic });
      expect(rows.map((r) => r.slug)).toContain(article.slug);
      for (const row of rows) expect(row.topic).toBe(article.topic);
    }
    expect(await list(t, { topic: "inne" })).toEqual([]);
  });

  it("filters by criterion and combines it with the topic", async () => {
    const t = await seeded();
    const byCriterion = await list(t, { criterionId: "komunikacja" });
    expect(byCriterion.map((r) => r.slug)).toEqual([
      "informacja-zwrotna-na-biezaco",
    ]);
    expect(
      await list(t, { criterionId: "komunikacja", topic: "docenianie" }),
    ).toEqual([]);
    expect(
      (await list(t, { criterionId: "zarzadzanie_ludzmi" })).map((r) => r.slug),
    ).toEqual(["docenianie-pracownikow", "informacja-zwrotna-na-biezaco"]);
  });

  it("searches title and summary without regard to case or diacritics", async () => {
    const t = await seeded();
    expect(
      (await list(t, { search: "DOCENIANIE" })).map((r) => r.slug),
    ).toEqual(["docenianie-pracownikow"]);
    expect((await list(t, { search: "dobrostan" })).map((r) => r.slug)).toEqual(
      ["dobrostan-zespolu-i-rownowaga"],
    );
    expect(
      (await list(t, { search: "dialog monolog" })).map((r) => r.slug),
    ).toEqual(["rozmowa-oceniajaca-to-dialog"]);
    expect(await list(t, { search: "   " })).toHaveLength(SEED_ADVICE.length);
    expect(await list(t, { search: "xyzxyz" })).toEqual([]);
  });

  it("finds 'zarządzanie' with a query typed without diacritics", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("adviceArticles", {
        slug: "zarzadzanie-czasem",
        title: "Zarządzanie czasem zespołu",
        summary: "Krótko o priorytetach.",
        topic: "inne",
        sections: [],
        source: "demo",
        published: true,
      }),
    );
    const rows = await list(t, { search: "zarzadzanie" });
    expect(rows.map((r) => r.slug)).toEqual(["zarzadzanie-czasem"]);
  });

  it("leaves out unpublished articles", async () => {
    const t = await seeded();
    const [first] = await t.run((ctx) =>
      ctx.db.query("adviceArticles").collect(),
    );
    await t.run((ctx) => ctx.db.patch(first._id, { published: false }));
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_ADVICE.length - 1);
    expect(rows.map((r) => r.slug)).not.toContain(first.slug);
  });
});

describe("getAdvice", () => {
  it("returns the whole article by slug, and null for an unknown or unpublished one", async () => {
    const t = await seeded();
    const found = await t.query(api.growth.advice.getAdvice, {
      slug: "docenianie-pracownikow",
    });
    expect(found?.sections.length).toBeGreaterThan(1);
    expect(
      await t.query(api.growth.advice.getAdvice, { slug: "nie-ma-takiej" }),
    ).toBeNull();
    await t.run((ctx) => ctx.db.patch(found!._id, { published: false }));
    expect(
      await t.query(api.growth.advice.getAdvice, {
        slug: "docenianie-pracownikow",
      }),
    ).toBeNull();
  });
});

describe("seed", () => {
  it("is idempotent", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.growth.adviceSeed.run, {});
    expect(first).toEqual({
      inserted: SEED_ADVICE.length,
      total: SEED_ADVICE.length,
    });
    expect(
      (await t.mutation(internal.growth.adviceSeed.run, {})).inserted,
    ).toBe(0);
    expect(await list(t)).toHaveLength(SEED_ADVICE.length);
  });
});

describe("seed data", () => {
  it("gives every article a source reference or the demonstration mark", () => {
    for (const article of SEED_ADVICE) {
      expect(article.source === "demo" || Boolean(article.sourceRef)).toBe(
        true,
      );
    }
  });

  it("covers every topic except 'inne' with at least 5 articles", () => {
    expect(SEED_ADVICE.length).toBeGreaterThanOrEqual(5);
    const covered = new Set(SEED_ADVICE.map((a) => a.topic));
    for (const topic of ADVICE_TOPICS.filter((t) => t !== "inne")) {
      expect(covered.has(topic)).toBe(true);
    }
  });

  it("keeps each article within 400 words and about 3 minutes of reading", () => {
    for (const article of SEED_ADVICE) {
      expect(wordCount(article)).toBeLessThanOrEqual(400);
      expect(article.readingMinutes).toBeLessThanOrEqual(3);
    }
  });

  it("has unique slugs, published articles and non-empty sections", () => {
    const slugs = SEED_ADVICE.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of SEED_ADVICE) {
      expect(article.published).toBe(true);
      expect(article.sections.length).toBeGreaterThan(0);
      for (const section of article.sections) {
        expect(section.heading.trim()).not.toBe("");
        expect(
          section.paragraphs.length + section.bullets.length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("names no link, price or statistic", () => {
    for (const article of SEED_ADVICE) {
      const text = JSON.stringify(article);
      expect(text).not.toMatch(/https?:|www\.|\d\s?(zł|PLN|EUR)|\d\s?%/i);
    }
  });
});
