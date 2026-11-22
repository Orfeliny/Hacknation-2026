import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import { ADVICE_LIMITS } from "../lib/contracts/advice";
import schema from "../schema";
import { ADVICE_TOPICS } from "./constants";
import { SEED_ADVICE } from "./adviceSeedData";

const modules = import.meta.glob("/convex/**/*.*s");

const newDb = () => convexTest(schema, modules);
type Db = ReturnType<typeof newDb>;

async function seeded() {
  const t = newDb();
  await t.mutation(internal.growth.adviceSeed.run, {});
  return t;
}

const list = (t: Db, args: object = {}) =>
  t.query(api.growth.advice.listAdvice, args);

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
  it("returns the published articles sorted by title, in the contract's shape", async () => {
    const t = await seeded();
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_ADVICE.length);
    const titles = rows.map((r) => r.title);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, "pl")),
    );
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        [
          "isDemo",
          "readingMinutes",
          "slug",
          "sourceRef",
          "summary",
          "title",
          "topic",
        ].sort(),
      );
    }
  });

  it("returns an empty list for an empty database", async () => {
    expect(await list(newDb())).toEqual([]);
  });

  it("is public: it needs no actor", async () => {
    const t = await seeded();
    await expect(list(t)).resolves.toHaveLength(SEED_ADVICE.length);
  });

  it("filters by topic", async () => {
    const t = await seeded();
    for (const article of SEED_ADVICE) {
      const rows = await list(t, { topic: article.topic });
      expect(rows.map((r) => r.slug)).toContain(article.slug);
      for (const row of rows) expect(row.topic).toBe(article.topic);
    }
    expect((await list(t, { topic: "dobrostan" })).map((r) => r.topic)).toEqual(
      ["dobrostan"],
    );
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

  it("finds 'zarządzanie' with a query typed without diacritics, and combines search with topic", async () => {
    const t = newDb();
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
    expect(
      (await list(t, { search: "zarzadzanie" })).map((r) => r.slug),
    ).toEqual(["zarzadzanie-czasem"]);
    expect(
      await list(t, { search: "zarzadzanie", topic: "docenianie" }),
    ).toEqual([]);
    expect(
      (await list(t, { search: "zarzadzanie", topic: "inne" })).map(
        (r) => r.slug,
      ),
    ).toEqual(["zarzadzanie-czasem"]);
  });

  it("marks a demonstration article with isDemo and a sourced one without", async () => {
    const t = await seeded();
    await t.run((ctx) =>
      ctx.db.insert("adviceArticles", {
        slug: "wzor",
        title: "Wzór",
        summary: "Demo.",
        topic: "inne",
        sections: [],
        source: "demo",
        published: true,
      }),
    );
    const rows = await list(t);
    expect(rows.find((r) => r.slug === "wzor")?.isDemo).toBe(true);
    expect(rows.find((r) => r.slug === "wzor")?.sourceRef).toBeUndefined();
    const sourced = rows.find((r) => r.slug === "docenianie-pracownikow");
    expect(sourced?.isDemo).toBe(false);
    expect(sourced?.sourceRef).toBeTruthy();
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

  it("rejects a search phrase over the limit and an argument outside the contract", async () => {
    const t = await seeded();
    await expect(
      list(t, { search: "x".repeat(ADVICE_LIMITS.search + 1) }),
    ).rejects.toThrow(/najwyżej 100 znaków/);
    await expect(list(t, { criterionId: "komunikacja" })).rejects.toThrow();
    expect(await list(t, { search: "x".repeat(ADVICE_LIMITS.search) })).toEqual(
      [],
    );
  });
});

describe("listAdvice by audience", () => {
  const employee = SEED_ADVICE.filter((a) => a.audience === "pracownik");
  const insert = (t: Db, slug: string, extra: object) =>
    t.run((ctx) =>
      ctx.db.insert("adviceArticles", {
        slug,
        title: slug,
        summary: "Krótko.",
        topic: "inne",
        sections: [],
        source: "demo",
        published: true,
        ...extra,
      }),
    );

  it("returns the employee articles for 'pracownik' and none of the supervisor ones", async () => {
    const t = await seeded();
    const slugs = (await list(t, { audience: "pracownik" })).map((r) => r.slug);
    expect(slugs.sort()).toEqual(employee.map((a) => a.slug).sort());
    expect(slugs).not.toContain("docenianie-pracownikow");
  });

  it("treats an article without an audience as written for supervisors", async () => {
    const t = await seeded();
    const slugs = (await list(t, { audience: "przelozony" })).map(
      (r) => r.slug,
    );
    expect(slugs).toContain("docenianie-pracownikow");
    for (const a of employee) expect(slugs).not.toContain(a.slug);
  });

  it("shows 'wszyscy' in both views and everything without a filter", async () => {
    const t = await seeded();
    await insert(t, "dla-wszystkich", { audience: "wszyscy" });
    const both = async (audience: "pracownik" | "przelozony") =>
      (await list(t, { audience })).map((r) => r.slug);
    expect(await both("pracownik")).toContain("dla-wszystkich");
    expect(await both("przelozony")).toContain("dla-wszystkich");
    expect(await list(t)).toHaveLength(SEED_ADVICE.length + 1);
  });

  it("combines audience with topic and search, ignoring diacritics", async () => {
    const t = await seeded();
    expect(
      (
        await list(t, { audience: "pracownik", topic: "rozmowa_oceniajaca" })
      ).map((r) => r.slug),
    ).toEqual([
      "przygotuj-sie-do-rozmowy-oceniajacej",
      "skad-sie-bierze-twoj-program-rozwoju",
    ]);
    expect(
      (await list(t, { audience: "pracownik", search: "SPRZECIW" })).map(
        (r) => r.slug,
      ),
    ).toEqual(["sprzeciw-od-oceny"]);
    expect(
      await list(t, { audience: "przelozony", search: "sprzeciw" }),
    ).toEqual([]);
  });

  it("rejects an audience outside the contract", async () => {
    const t = await seeded();
    await expect(list(t, { audience: "dyrektor" })).rejects.toThrow();
  });
});

describe("getAdvice", () => {
  it("returns the whole article by slug, in the contract's shape", async () => {
    const t = await seeded();
    const seed = SEED_ADVICE.find((a) => a.slug === "docenianie-pracownikow")!;
    const found = await t.query(api.growth.advice.getAdvice, {
      slug: seed.slug,
    });
    expect(found).toMatchObject({
      slug: seed.slug,
      title: seed.title,
      isDemo: false,
      sourceRef: seed.sourceRef,
      readingMinutes: seed.readingMinutes,
    });
    expect(found?.sections).toEqual(seed.sections);
    expect(Object.keys(found!).sort()).toEqual(
      [
        "isDemo",
        "readingMinutes",
        "sections",
        "slug",
        "sourceRef",
        "summary",
        "title",
        "topic",
      ].sort(),
    );
  });

  it("returns null for an unknown, too long or unpublished slug", async () => {
    const t = await seeded();
    const get = (slug: string) =>
      t.query(api.growth.advice.getAdvice, { slug });
    expect(await get("nie-ma-takiej")).toBeNull();
    expect(await get("a".repeat(ADVICE_LIMITS.slug + 1))).toBeNull();
    const [row] = await t.run((ctx) =>
      ctx.db.query("adviceArticles").collect(),
    );
    await t.run((ctx) => ctx.db.patch(row._id, { published: false }));
    expect(await get(row.slug)).toBeNull();
  });
});

describe("seed", () => {
  it("is idempotent", async () => {
    const t = newDb();
    expect(await t.mutation(internal.growth.adviceSeed.run, {})).toEqual({
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
  it("has at least 4 articles for employees, each with a source", () => {
    const employee = SEED_ADVICE.filter((a) => a.audience === "pracownik");
    expect(employee.length).toBeGreaterThanOrEqual(4);
    for (const article of employee) {
      expect(article.source === "demo" || Boolean(article.sourceRef)).toBe(
        true,
      );
      expect(wordCount(article)).toBeLessThanOrEqual(400);
    }
  });

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
    for (const topic of ADVICE_TOPICS.filter((x) => x !== "inne")) {
      expect(covered.has(topic)).toBe(true);
    }
  });

  it("keeps each article within 400 words and about 3 minutes of reading", () => {
    for (const article of SEED_ADVICE) {
      expect(wordCount(article)).toBeLessThanOrEqual(400);
      expect(article.readingMinutes).toBeLessThanOrEqual(3);
    }
  });

  it("has unique slugs within the slug limit, published articles and non-empty sections", () => {
    const slugs = SEED_ADVICE.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of SEED_ADVICE) {
      expect(article.slug.length).toBeLessThanOrEqual(ADVICE_LIMITS.slug);
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
      expect(JSON.stringify(article)).not.toMatch(
        /https?:|www\.|\d\s?(zł|PLN|EUR)|\d\s?%/i,
      );
    }
  });
});
