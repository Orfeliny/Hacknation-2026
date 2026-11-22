import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("/convex/**/*.*s");

describe("demo seed", () => {
  it("inserts schema-valid demo data", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(internal.seed.seed, {});

    expect(result.seeded).toBe(true);
    expect(
      await t.run((ctx) => ctx.db.query("employees").collect()),
    ).toHaveLength(10);
    expect(
      await t.run((ctx) => ctx.db.query("reviews").collect()),
    ).toHaveLength(5);
  });

  it("does not duplicate data when run twice", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.seed.seed, {});
    const second = await t.mutation(internal.seed.seed, {});

    expect(second.seeded).toBe(false);
    expect(
      await t.run((ctx) => ctx.db.query("employees").collect()),
    ).toHaveLength(10);
  });
});
