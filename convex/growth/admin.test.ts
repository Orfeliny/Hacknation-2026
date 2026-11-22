import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

const hr = { role: "hr" } as const;

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  await t.mutation(internal.growth.seed.run, {});
  await t.mutation(internal.growth.adviceSeed.run, {});
  return t;
}
type Db = Awaited<ReturnType<typeof seeded>>;

const option = {
  title: "Warsztat o informacji zwrotnej",
  description: "Praktyczne ćwiczenia z rozmowy z pracownikiem.",
  form: "szkolenie",
  criterionIds: ["komunikacja"],
  level: "podstawowy",
  cost: "bezplatne",
} as const;

const article = {
  title: "Jak prowadzić krótkie spotkania",
  summary: "Kilka zasad na dobry początek.",
  topic: "inne",
  sections: [
    { heading: "Zasady", paragraphs: ["Zacznij od celu."], bullets: [] },
  ],
} as const;

const saveOption = (t: Db, args: object = {}, actor: object = hr) =>
  t.mutation(api.growth.admin.saveOption, {
    actor,
    ...option,
    ...args,
  } as never);

const saveArticle = (t: Db, args: object = {}, actor: object = hr) =>
  t.mutation(api.growth.admin.saveArticle, {
    actor,
    ...article,
    ...args,
  } as never);

const auditOf = (t: Db, entity: string, id: string) =>
  t.run((ctx) =>
    ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) => q.eq("entity", entity).eq("entityId", id))
      .collect(),
  );

describe("access", () => {
  const others = ["supervisor", "employee", "director", "admin"] as const;

  it.each(others)("rejects the %s role on every function", async (role) => {
    const t = await seeded();
    const actor = { role };
    const [row] = await t.run((ctx) =>
      ctx.db.query("developmentOptions").collect(),
    );
    const [art] = await t.run((ctx) =>
      ctx.db.query("adviceArticles").collect(),
    );
    const denied = /tylko kadry/;
    await expect(
      t.query(api.growth.admin.listOptionsAdmin, { actor }),
    ).rejects.toThrow(denied);
    await expect(
      t.query(api.growth.admin.listArticlesAdmin, { actor }),
    ).rejects.toThrow(denied);
    await expect(saveOption(t, {}, actor)).rejects.toThrow(denied);
    await expect(
      t.mutation(api.growth.admin.setOptionActive, {
        actor,
        optionId: row._id,
        active: false,
      }),
    ).rejects.toThrow(denied);
    await expect(saveArticle(t, {}, actor)).rejects.toThrow(denied);
    await expect(
      t.mutation(api.growth.admin.setArticlePublished, {
        actor,
        articleId: art._id,
        published: false,
      }),
    ).rejects.toThrow(denied);
    expect(await t.run((ctx) => ctx.db.query("auditLog").collect())).toEqual(
      [],
    );
  });
});

describe("catalog entries", () => {
  it("creates an active entry with source urzad and a trimmed, validated body", async () => {
    const t = await seeded();
    const id = await saveOption(t, {
      title: "  Warsztat o informacji zwrotnej  ",
      url: "https://example.org/warsztat",
      provider: "",
    });
    const row = await t.run((ctx) =>
      ctx.db.get(id as Id<"developmentOptions">),
    );
    expect(row).toMatchObject({
      title: "Warsztat o informacji zwrotnej",
      source: "urzad",
      active: true,
      url: "https://example.org/warsztat",
    });
    expect(row?.provider).toBeUndefined();
  });

  it("shows a new entry in listOptions and suggestForArea", async () => {
    const t = await seeded();
    await saveOption(t, { title: "Zupełnie nowy warsztat" });
    const listed = await t.query(api.growth.options.listOptions, {});
    expect(listed.map((o) => o.title)).toContain("Zupełnie nowy warsztat");
    const suggested = await t.query(api.growth.suggest.suggestForArea, {
      criterionIds: ["komunikacja"],
    });
    expect(suggested.map((s) => s.option.title)).toContain(
      "Zupełnie nowy warsztat",
    );
  });

  it("updates an entry and keeps its source and active flag", async () => {
    const t = await seeded();
    const [seed] = await t.run((ctx) =>
      ctx.db.query("developmentOptions").collect(),
    );
    await saveOption(t, { optionId: seed._id, title: "Poprawiony tytuł" });
    const row = await t.run((ctx) => ctx.db.get(seed._id));
    expect(row).toMatchObject({
      title: "Poprawiony tytuł",
      source: seed.source,
      sourceRef: seed.sourceRef,
      active: true,
    });
  });

  it("reports an unknown entry", async () => {
    const t = await seeded();
    const [seed] = await t.run((ctx) =>
      ctx.db.query("developmentOptions").collect(),
    );
    await t.run((ctx) => ctx.db.delete(seed._id));
    await expect(saveOption(t, { optionId: seed._id })).rejects.toThrow(
      /Nie znaleziono wpisu/,
    );
    await expect(
      t.mutation(api.growth.admin.setOptionActive, {
        actor: hr,
        optionId: seed._id,
        active: false,
      }),
    ).rejects.toThrow(/Nie znaleziono wpisu/);
  });

  it("rejects an empty title, no criterion and an address other than https://", async () => {
    const t = await seeded();
    await expect(saveOption(t, { title: "   " })).rejects.toThrow(
      /Tytuł: wpisz treść/,
    );
    await expect(saveOption(t, { criterionIds: [] })).rejects.toThrow(
      /co najmniej jedno kryterium/,
    );
    await expect(saveOption(t, { url: "http://example.org" })).rejects.toThrow(
      /https:\/\//,
    );
    await expect(saveOption(t, { url: "javascript:alert(1)" })).rejects.toThrow(
      /https:\/\//,
    );
    await expect(saveOption(t, { url: "https:foo" })).rejects.toThrow(
      /https:\/\//,
    );
    await expect(
      saveOption(t, { url: "  HTTPS://example.org/x  " }),
    ).resolves.toBeTruthy();
    await expect(saveOption(t, { url: "nie adres" })).rejects.toThrow(
      /https:\/\//,
    );
  });

  it("rejects a criterion outside the 2016 pack", async () => {
    const t = await seeded();
    await expect(
      saveOption(t, { criterionIds: ["wymyslone"] }),
    ).rejects.toThrow();
  });

  it("switches an entry off and on without deleting it", async () => {
    const t = await seeded();
    const id = (await saveOption(t, {
      title: "Wyłączany warsztat",
    })) as Id<"developmentOptions">;
    await t.mutation(api.growth.admin.setOptionActive, {
      actor: hr,
      optionId: id,
      active: false,
    });
    const listed = await t.query(api.growth.options.listOptions, {});
    expect(listed.map((o) => o._id)).not.toContain(id);
    const suggested = await t.query(api.growth.suggest.suggestForArea, {
      criterionIds: ["komunikacja"],
    });
    expect(suggested.map((s) => s.option._id)).not.toContain(id);
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      active: false,
    });
    const admin = await t.query(api.growth.admin.listOptionsAdmin, {
      actor: hr,
    });
    expect(admin.map((o) => o._id)).toContain(id);

    await t.mutation(api.growth.admin.setOptionActive, {
      actor: hr,
      optionId: id,
      active: true,
    });
    expect(
      (await t.query(api.growth.options.listOptions, {})).map((o) => o._id),
    ).toContain(id);
  });

  it("records every write in the audit log, ids only", async () => {
    const t = await seeded();
    const id = (await saveOption(t)) as Id<"developmentOptions">;
    await saveOption(t, { optionId: id, description: "Inny opis." });
    await t.mutation(api.growth.admin.setOptionActive, {
      actor: hr,
      optionId: id,
      active: false,
    });
    const entries = await auditOf(t, "developmentOption", id);
    expect(entries.map((e) => e.action)).toEqual([
      "create",
      "update",
      "update",
    ]);
    expect(entries.map((e) => e.details)).toEqual([
      undefined,
      undefined,
      "inactive",
    ]);
    expect(entries.every((e) => e.actorRole === "hr")).toBe(true);
    expect(JSON.stringify(entries)).not.toContain("Inny opis");
  });
});

describe("advice articles", () => {
  it("creates an unpublished article with source urzad and a slug from the title", async () => {
    const t = await seeded();
    const id = (await saveArticle(t, {
      title: "Żółta kartka: jak ją dać?",
    })) as Id<"adviceArticles">;
    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row).toMatchObject({
      slug: "zolta-kartka-jak-ja-dac",
      source: "urzad",
      published: false,
    });
  });

  it("makes the slug unique and keeps it when the title changes", async () => {
    const t = await seeded();
    const a = (await saveArticle(t)) as Id<"adviceArticles">;
    const b = (await saveArticle(t)) as Id<"adviceArticles">;
    const slugs = async () =>
      (await t.run((ctx) => Promise.all([ctx.db.get(a), ctx.db.get(b)]))).map(
        (r) => r?.slug,
      );
    expect(await slugs()).toEqual([
      "jak-prowadzic-krotkie-spotkania",
      "jak-prowadzic-krotkie-spotkania-2",
    ]);
    await saveArticle(t, { articleId: a, title: "Zupełnie inny tytuł" });
    expect(await slugs()).toEqual([
      "jak-prowadzic-krotkie-spotkania",
      "jak-prowadzic-krotkie-spotkania-2",
    ]);
  });

  it("shows an article in listAdvice only once it is published, and hides it again", async () => {
    const t = await seeded();
    const id = (await saveArticle(t)) as Id<"adviceArticles">;
    const slugs = async () =>
      (await t.query(api.growth.advice.listAdvice, {})).map((r) => r.slug);
    expect(await slugs()).not.toContain("jak-prowadzic-krotkie-spotkania");
    const preview = await t.query(api.growth.admin.listArticlesAdmin, {
      actor: hr,
    });
    expect(preview.find((r) => r._id === id)).toMatchObject({
      published: false,
      sections: article.sections,
    });

    await t.mutation(api.growth.admin.setArticlePublished, {
      actor: hr,
      articleId: id,
      published: true,
    });
    expect(await slugs()).toContain("jak-prowadzic-krotkie-spotkania");
    await t.mutation(api.growth.admin.setArticlePublished, {
      actor: hr,
      articleId: id,
      published: false,
    });
    expect(await slugs()).not.toContain("jak-prowadzic-krotkie-spotkania");
  });

  it("keeps source and published on edit", async () => {
    const t = await seeded();
    const [seed] = await t.run((ctx) =>
      ctx.db.query("adviceArticles").collect(),
    );
    await saveArticle(t, { articleId: seed._id, topic: seed.topic });
    expect(await t.run((ctx) => ctx.db.get(seed._id))).toMatchObject({
      slug: seed.slug,
      source: seed.source,
      published: true,
    });
  });

  it("rejects empty fields, sections without content and too many sections", async () => {
    const t = await seeded();
    await expect(saveArticle(t, { title: "" })).rejects.toThrow(/Tytuł/);
    await expect(saveArticle(t, { summary: " " })).rejects.toThrow(
      /Streszczenie/,
    );
    await expect(saveArticle(t, { sections: [] })).rejects.toThrow(
      /co najmniej jedną sekcję/,
    );
    await expect(
      saveArticle(t, {
        sections: [{ heading: "Tylko nagłówek", paragraphs: [], bullets: [] }],
      }),
    ).rejects.toThrow(/akapitu lub punktu/);
    await expect(
      saveArticle(t, {
        sections: [{ heading: " ", paragraphs: ["x"], bullets: [] }],
      }),
    ).rejects.toThrow(/Nagłówek sekcji/);
    await expect(
      saveArticle(t, {
        sections: Array.from({ length: 21 }, () => ({
          heading: "S",
          paragraphs: ["x"],
          bullets: [],
        })),
      }),
    ).rejects.toThrow(/Najwyżej 20 sekcji/);
    await expect(saveArticle(t, { readingMinutes: 0 })).rejects.toThrow(
      /Czas czytania/,
    );
  });

  it("records create, update and publish in the audit log", async () => {
    const t = await seeded();
    const id = (await saveArticle(t)) as Id<"adviceArticles">;
    await saveArticle(t, { articleId: id, summary: "Nowe streszczenie." });
    await t.mutation(api.growth.admin.setArticlePublished, {
      actor: hr,
      articleId: id,
      published: true,
    });
    await t.mutation(api.growth.admin.setArticlePublished, {
      actor: hr,
      articleId: id,
      published: true,
    });
    const entries = await auditOf(t, "adviceArticle", id);
    expect(entries.map((e) => [e.action, e.details])).toEqual([
      ["create", undefined],
      ["update", undefined],
      ["update", "published"],
    ]);
  });

  it("stores the audience and shows the article only to that audience once published", async () => {
    const t = await seeded();
    const id = (await saveArticle(t, {
      title: "Dla pracownika: nowa porada",
      audience: "pracownik",
    })) as Id<"adviceArticles">;
    await t.mutation(api.growth.admin.setArticlePublished, {
      actor: hr,
      articleId: id,
      published: true,
    });
    const slugs = async (audience: "pracownik" | "przelozony") =>
      (await t.query(api.growth.advice.listAdvice, { audience })).map(
        (r) => r.slug,
      );
    expect(await slugs("pracownik")).toContain("dla-pracownika-nowa-porada");
    expect(await slugs("przelozony")).not.toContain(
      "dla-pracownika-nowa-porada",
    );
  });

  it("leaves the audience unset when none is given, which counts as supervisors", async () => {
    const t = await seeded();
    const id = (await saveArticle(t)) as Id<"adviceArticles">;
    expect((await t.run((ctx) => ctx.db.get(id)))?.audience).toBeUndefined();
  });

  it("keeps the stored audience on edit when none is sent and changes it when one is", async () => {
    const t = await seeded();
    const id = (await saveArticle(t, {
      audience: "wszyscy",
    })) as Id<"adviceArticles">;
    await saveArticle(t, { articleId: id, summary: "Nowe streszczenie." });
    expect((await t.run((ctx) => ctx.db.get(id)))?.audience).toBe("wszyscy");
    await saveArticle(t, { articleId: id, audience: "pracownik" });
    expect((await t.run((ctx) => ctx.db.get(id)))?.audience).toBe("pracownik");
  });

  it("rejects an audience outside the contract", async () => {
    const t = await seeded();
    await expect(saveArticle(t, { audience: "dyrektor" })).rejects.toThrow();
  });

  it("reports an unknown article", async () => {
    const t = await seeded();
    const id = (await saveArticle(t)) as Id<"adviceArticles">;
    await t.run((ctx) => ctx.db.delete(id));
    await expect(saveArticle(t, { articleId: id })).rejects.toThrow(
      /Nie znaleziono porady/,
    );
    await expect(
      t.mutation(api.growth.admin.setArticlePublished, {
        actor: hr,
        articleId: id,
        published: true,
      }),
    ).rejects.toThrow(/Nie znaleziono porady/);
  });
});
