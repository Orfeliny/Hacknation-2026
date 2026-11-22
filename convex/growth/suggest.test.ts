import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { RULES_2016 } from "../rules/pack2016";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

type Criteria = Doc<"developmentOptions">["criterionIds"];

const option = (
  title: string,
  criterionIds: Criteria,
  extra: Partial<Doc<"developmentOptions">> = {},
) => ({
  title,
  description: "Opis",
  form: "szkolenie" as const,
  criterionIds,
  level: "podstawowy" as const,
  cost: "brak_danych" as const,
  source: "demo" as const,
  active: true,
  ...extra,
});

async function catalog(options: ReturnType<typeof option>[]) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (const row of options) await ctx.db.insert("developmentOptions", row);
  });
  return t;
}

const nameOf = (id: string) =>
  RULES_2016.catalog.find((entry) => entry.id === id)!.name;

describe("suggestForArea", () => {
  it("returns only active entries that share a criterion, with the reason", async () => {
    const t = await catalog([
      option("Szkolenie z komunikacji", ["komunikacja"]),
      option("Mentoring", ["wspolpraca"]),
      option("Wycofane", ["komunikacja"], { active: false }),
    ]);
    const rows = await t.query(api.growth.suggest.suggestForArea, {
      criterionIds: ["komunikacja"],
    });
    expect(rows.map((r) => r.option.title)).toEqual([
      "Szkolenie z komunikacji",
    ]);
    expect(rows[0]).toMatchObject({
      matchedCriterionIds: ["komunikacja"],
      reason: `Pasuje do kryterium: ${nameOf("komunikacja")}`,
    });
  });

  it("returns nothing for a criterion without entries and for an empty list", async () => {
    const t = await catalog([option("Mentoring", ["wspolpraca"])]);
    expect(
      await t.query(api.growth.suggest.suggestForArea, {
        criterionIds: ["komunikacja"],
      }),
    ).toEqual([]);
    expect(
      await t.query(api.growth.suggest.suggestForArea, { criterionIds: [] }),
    ).toEqual([]);
    expect(
      await convexTest(schema, modules).query(
        api.growth.suggest.suggestForArea,
        { criterionIds: ["komunikacja"] },
      ),
    ).toEqual([]);
  });

  it("puts the entry that matches more of several criteria first", async () => {
    const t = await catalog([
      option("A jedno kryterium", ["komunikacja"]),
      option("B oba kryteria", ["komunikacja", "wspolpraca"]),
      option("C drugie kryterium", ["wspolpraca"]),
    ]);
    const rows = await t.query(api.growth.suggest.suggestForArea, {
      criterionIds: ["komunikacja", "wspolpraca"],
    });
    expect(rows.map((r) => r.option.title)).toEqual([
      "B oba kryteria",
      "A jedno kryterium",
      "C drugie kryterium",
    ]);
    expect(rows[0]?.matchedCriterionIds).toEqual(["komunikacja", "wspolpraca"]);
    expect(rows[0]?.reason).toMatch(/^Pasuje do kryteriów: /);
  });

  it("ranks the requested level first without dropping the others", async () => {
    const t = await catalog([
      option("A podstawowy", ["komunikacja"], { level: "podstawowy" }),
      option("B zaawansowany", ["komunikacja"], { level: "zaawansowany" }),
    ]);
    const rows = await t.query(api.growth.suggest.suggestForArea, {
      criterionIds: ["komunikacja"],
      level: "zaawansowany",
    });
    expect(rows.map((r) => r.option.title)).toEqual([
      "B zaawansowany",
      "A podstawowy",
    ]);
    expect(rows[0]?.reason).toContain("poziom: zaawansowany");
    expect(rows[1]?.reason).not.toContain("poziom");
  });

  it("counts a repeated criterion once", async () => {
    const t = await catalog([option("A", ["komunikacja"])]);
    const rows = await t.query(api.growth.suggest.suggestForArea, {
      criterionIds: ["komunikacja", "komunikacja"],
    });
    expect(rows[0]?.matchedCriterionIds).toEqual(["komunikacja"]);
  });
});
