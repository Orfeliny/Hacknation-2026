import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { RULES_2016 } from "../rules/pack2016";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const option = (extra: object = {}) => ({
  title: "Informacja zwrotna w praktyce",
  description: "Warsztat o udzielaniu informacji zwrotnej.",
  form: "szkolenie",
  criterionIds: ["komunikacja", "wspolpraca"],
  level: "podstawowy",
  cost: "brak_danych",
  source: "demo",
  active: true,
  ...extra,
});

const article = (extra: object = {}) => ({
  slug: "jak-docenic-pracownika",
  title: "Jak docenić pracownika",
  summary: "Krótko o docenianiu na co dzień.",
  topic: "docenianie",
  sections: [
    {
      heading: "Dlaczego to ważne",
      paragraphs: ["Docenienie wzmacnia zaangażowanie."],
      bullets: ["Mów konkretnie", "Mów od razu"],
    },
  ],
  source: "demo",
  published: true,
  ...extra,
});

function insert(table: "developmentOptions" | "adviceArticles", doc: object) {
  const t = convexTest(schema, modules);
  return t.run((ctx) => ctx.db.insert(table, doc as never));
}

describe("growth tables", () => {
  it("accepts a valid development option and advice article", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("developmentOptions", option() as never);
      await ctx.db.insert(
        "adviceArticles",
        article({ criterionIds: ["komunikacja"], readingMinutes: 4 }) as never,
      );
    });
    const found = await t.run((ctx) =>
      ctx.db
        .query("adviceArticles")
        .withIndex("by_slug", (q) => q.eq("slug", "jak-docenic-pracownika"))
        .unique(),
    );
    expect(found?.title).toBe("Jak docenić pracownika");
  });

  it("accepts every criterion id from the 2016 pack", async () => {
    const ids = RULES_2016.catalog.map((entry) => entry.id);
    await expect(
      insert("developmentOptions", option({ criterionIds: ids })),
    ).resolves.toBeDefined();
  });

  it("rejects an unknown form or source", async () => {
    await expect(
      insert("developmentOptions", option({ form: "webinar" })),
    ).rejects.toThrow();
    await expect(
      insert("developmentOptions", option({ source: "internet" })),
    ).rejects.toThrow();
    await expect(
      insert("adviceArticles", article({ source: "internet" })),
    ).rejects.toThrow();
  });

  it("rejects criterion ids outside the 2016 pack in both tables", async () => {
    await expect(
      insert("developmentOptions", option({ criterionIds: ["nieznane"] })),
    ).rejects.toThrow();
    await expect(
      insert("adviceArticles", article({ criterionIds: ["nieznane"] })),
    ).rejects.toThrow();
  });
});
