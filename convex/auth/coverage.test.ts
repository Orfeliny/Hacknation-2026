import { describe, expect, it } from "vitest";

const sources = import.meta.glob<string>("/convex/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

// Actions cannot read the database, so they pass `actor` to an internal query that calls resolveActor. The
// identity reaches that query (checked in the OIDC spike), so these are covered too.
const VIA_INTERNAL_QUERY = [
  "/convex/conversations/actions.ts",
  "/convex/drafting/actions.ts",
  "/convex/hrPartner/actions.ts",
  "/convex/signatures/actions.ts",
];

const takesActor = ([path, text]: [string, string]) =>
  !path.includes("/_generated/") &&
  !path.endsWith(".test.ts") &&
  !path.startsWith("/convex/lib/") &&
  !path.startsWith("/convex/auth/") &&
  text.includes("demoActor");

// In `oidc` mode `resolveActor` is what turns "the caller says it is HR" into "the token says so". A function
// that takes an actor and never resolves it would still trust the caller's word.
describe("every backend function that takes an actor resolves it", () => {
  const files = Object.entries(sources).filter(takesActor);

  it("finds the modules that take an actor", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map(([path]) => path))("%s", (path) => {
    const text = sources[path] ?? "";
    if (VIA_INTERNAL_QUERY.includes(path)) {
      expect(text).toMatch(/ctx\.runQuery\(/);
      expect(text).toMatch(/\bactor\b/);
      return;
    }
    expect(text).toMatch(/resolveActor\(/);
  });

  it("lists only actions that exist and still pass the actor on", () => {
    for (const path of VIA_INTERNAL_QUERY) {
      expect(sources[path]).toBeDefined();
    }
  });
});
