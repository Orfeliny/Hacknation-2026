import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { DEVELOPMENT_FORMS } from "./constants";
import { matchesSearch, normalizeText } from "./optionsSearch";
import { SEED_OPTIONS } from "./optionsSeedData";

const modules = import.meta.glob("/convex/**/*.*s");

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.growth.seed.run, {});
  return t;
}

const list = (t: Awaited<ReturnType<typeof seeded>>, args = {}) =>
  t.query(api.growth.options.listOptions, args);

describe("listOptions", () => {
  it("returns every active entry sorted by title when no filter is set", async () => {
    const t = await seeded();
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_OPTIONS.length);
    const titles = rows.map((r) => r.title);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, "pl")),
    );
  });

  it("returns an empty list for an empty catalog", async () => {
    const t = convexTest(schema, modules);
    expect(await list(t)).toEqual([]);
  });

  it("filters by criterion: only entries with that id in criterionIds", async () => {
    const t = await seeded();
    const rows = await list(t, { criterionId: "komunikacja" });
    const expected = SEED_OPTIONS.filter((o) =>
      o.criterionIds.includes("komunikacja"),
    );
    expect(rows).toHaveLength(expected.length);
    expect(expected.length).toBeGreaterThan(2);
    for (const row of rows) expect(row.criterionIds).toContain("komunikacja");
  });

  it("combines criterion and form", async () => {
    const t = await seeded();
    const rows = await list(t, {
      criterionId: "komunikacja",
      form: "szkolenie",
    });
    expect(rows.map((r) => r.title)).toEqual([
      "Szkolenie z komunikacji i informacji zwrotnej",
      "Szkolenie z negocjacji",
    ]);
  });

  it("combines criterion and level", async () => {
    const t = await seeded();
    const rows = await list(t, {
      criterionId: "wspolpraca",
      level: "zaawansowany",
    });
    expect(rows.map((r) => r.title)).toEqual([
      "Czasowa mobilność: zadania w innej komórce lub urzędzie",
    ]);
  });

  it("combines form, level and cost, and returns nothing when none match", async () => {
    const t = await seeded();
    const some = await list(t, {
      form: "szkolenie",
      level: "podstawowy",
      cost: "brak_danych",
    });
    expect(some.length).toBeGreaterThan(0);
    for (const row of some) {
      expect(row).toMatchObject({ form: "szkolenie", level: "podstawowy" });
    }
    expect(await list(t, { form: "szkolenie", cost: "bezplatne" })).toEqual([]);
  });

  it("searches title and description without regard to case or diacritics", async () => {
    const t = await seeded();
    const byTitle = await list(t, { search: "NEGOCJACJI" });
    expect(byTitle.map((r) => r.title)).toContain("Szkolenie z negocjacji");
    const byDiacritics = await list(t, { search: "wystapien" });
    expect(byDiacritics.map((r) => r.title)).toContain(
      "Kurs wystąpień publicznych",
    );
    const byDescription = await list(t, {
      search: "wymiana doświadczeń osobą",
    });
    expect(byDescription.map((r) => r.title)).toEqual(["Mentoring wewnętrzny"]);
    expect(await list(t, { search: "   " })).toHaveLength(SEED_OPTIONS.length);
    expect(await list(t, { search: "xyzxyz" })).toEqual([]);
  });

  it("leaves out inactive entries", async () => {
    const t = await seeded();
    const [first] = await list(t);
    await t.run((ctx) => ctx.db.patch(first._id, { active: false }));
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_OPTIONS.length - 1);
    expect(rows.map((r) => r._id)).not.toContain(first._id);
  });

  it("is open to a caller with no role", async () => {
    const t = await seeded();
    await expect(list(t)).resolves.toHaveLength(SEED_OPTIONS.length);
  });
});

describe("getOption", () => {
  it("returns one active entry and null for an inactive one", async () => {
    const t = await seeded();
    const [first] = await list(t);
    const found = await t.query(api.growth.options.getOption, {
      optionId: first._id,
    });
    expect(found?.title).toBe(first.title);
    await t.run((ctx) => ctx.db.patch(first._id, { active: false }));
    expect(
      await t.query(api.growth.options.getOption, { optionId: first._id }),
    ).toBeNull();
  });
});

describe("seed", () => {
  it("is idempotent", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.growth.seed.run, {});
    expect(first).toEqual({
      inserted: SEED_OPTIONS.length,
      total: SEED_OPTIONS.length,
    });
    const second = await t.mutation(internal.growth.seed.run, {});
    expect(second.inserted).toBe(0);
    expect(await list(t)).toHaveLength(SEED_OPTIONS.length);
  });
});

describe("seed data", () => {
  it("gives demo entries no url and no provider, and every other entry a sourceRef", () => {
    for (const option of SEED_OPTIONS) {
      if (option.source === "demo") {
        expect(option.url).toBeUndefined();
        expect(option.provider).toBeUndefined();
      } else {
        expect(option.sourceRef).toBeTruthy();
      }
    }
  });

  it("names no price, provider or link anywhere", () => {
    for (const option of SEED_OPTIONS) {
      expect(option.provider).toBeUndefined();
      expect(option.url).toBeUndefined();
      expect(option.costNote).toBeUndefined();
      expect(option.cost).toBe("brak_danych");
      expect(`${option.title} ${option.description}`).not.toMatch(
        /https?:|www\.|\d\s?(zł|PLN|EUR)/i,
      );
    }
  });

  it("has unique titles, both kinds of source and every form", () => {
    const titles = SEED_OPTIONS.map((o) => o.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(SEED_OPTIONS.map((o) => o.source))).toEqual(
      new Set(["demo", "material_kprm"]),
    );
    expect(new Set(SEED_OPTIONS.map((o) => o.form))).toEqual(
      new Set(DEVELOPMENT_FORMS),
    );
    for (const option of SEED_OPTIONS) {
      expect(option.criterionIds.length).toBeGreaterThan(0);
      expect(option.active).toBe(true);
    }
  });
});

describe("text matching", () => {
  it("drops diacritics, including ł, and case", () => {
    expect(normalizeText("Zarządzanie Łódź")).toBe("zarzadzanie lodz");
  });

  it("requires every word of the query", () => {
    expect(
      matchesSearch(["Szkolenie z negocjacji"], "negocjacji szkolenie"),
    ).toBe(true);
    expect(matchesSearch(["Szkolenie z negocjacji"], "negocjacji kurs")).toBe(
      false,
    );
    expect(matchesSearch(["cokolwiek"], "")).toBe(true);
  });
});
