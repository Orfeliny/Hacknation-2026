import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { resolveActor } from "./demoRole";

const modules = import.meta.glob("/convex/**/*.*s");

const person = (demoPersona: "supervisor" | "hr") => ({
  firstName: "A",
  lastName: "B",
  position: "C",
  unit: "D",
  createdAt: 0,
  demoPersona,
});

describe("resolveActor", () => {
  it("returns the seeded persona for a role", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const id = await ctx.db.insert("employees", person("supervisor"));
      const actor = await resolveActor(ctx, { role: "supervisor" });
      expect(actor.role).toBe("supervisor");
      expect(actor.employee?._id).toBe(id);
    });
  });

  it("returns employee null when no persona is seeded", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      expect(await resolveActor(ctx, { role: "director" })).toEqual({
        role: "director",
        employee: null,
      });
    });
  });

  it("throws when two employees share a persona", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("employees", person("hr"));
      await ctx.db.insert("employees", person("hr"));
      await expect(resolveActor(ctx, { role: "hr" })).rejects.toThrow(
        /share the demo persona/,
      );
    });
  });
});
