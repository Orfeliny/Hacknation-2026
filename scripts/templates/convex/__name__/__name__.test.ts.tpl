import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.*s");

describe("__name__", () => {
  it("lists an entry after it was added, with trimmed text", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.__name__.mutations.add, { text: "  hello  " });

    const entries = await t.query(api.__name__.queries.list, {});

    expect(entries).toHaveLength(1);
    expect(entries[0]?.text).toBe("hello");
  });

  it("rejects empty and over-long text", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.__name__.mutations.add, { text: "   " }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.__name__.mutations.add, { text: "a".repeat(501) }),
    ).rejects.toThrow();
    expect(await t.query(api.__name__.queries.list, {})).toHaveLength(0);
  });

  it("counts entries through the action", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.__name__.mutations.add, { text: "one" });
    await t.mutation(api.__name__.mutations.add, { text: "two" });

    expect(await t.action(api.__name__.actions.count, {})).toEqual({
      total: 2,
    });
  });
});
