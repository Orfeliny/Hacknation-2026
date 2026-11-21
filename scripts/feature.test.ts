import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addToSchema,
  isConvexConfigured,
  parseArgs,
  scaffold,
  validateName,
} from "./feature.mjs";

const SCHEMA = `import { defineSchema } from "convex/server";
import { notesTables } from "./notes/tables";

export default defineSchema({
  ...notesTables,
});
`;

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "feature-test-"));
  mkdirSync(join(root, "convex", "notes"), { recursive: true });
  mkdirSync(join(root, "src", "features", "notes"), { recursive: true });
  writeFileSync(join(root, "convex", "schema.ts"), SCHEMA);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("validateName", () => {
  it("accepts lowercase alphanumerics", () => {
    expect(validateName(root, "tasks")).toBeNull();
    expect(validateName(root, "demo2")).toBeNull();
  });

  it.each([
    "",
    "a",
    "Tasks",
    "my-feature",
    "snake_case",
    "2fast",
    "x".repeat(25),
  ])("rejects %j with a Polish message", (name) => {
    expect(validateName(root, name)).toMatch(/Niepoprawna nazwa/);
  });

  it("rejects reserved words", () => {
    expect(validateName(root, "lib")).toMatch(/zarezerwowana/);
    expect(validateName(root, "schema")).toMatch(/zarezerwowana/);
  });

  it("rejects an existing feature", () => {
    expect(validateName(root, "notes")).toMatch(/już istnieje/);
  });
});

describe("scaffold", () => {
  it("creates the frontend, backend and test files from the templates", () => {
    const { created, schemaRegistered } = scaffold({ root, name: "demo" });

    expect(schemaRegistered).toBe(false);
    expect(created.sort()).toEqual(
      [
        "convex/demo/actions.ts",
        "convex/demo/demo.test.ts",
        "convex/demo/limits.ts",
        "convex/demo/mutations.ts",
        "convex/demo/queries.ts",
        "convex/demo/tables.ts",
        "src/features/demo/DemoForm.tsx",
        "src/features/demo/DemoPage.tsx",
        "src/features/demo/demo.test.tsx",
        "src/features/demo/feature.tsx",
        "src/features/demo/schema.ts",
      ].sort(),
    );
    for (const file of created) {
      expect(read(file)).not.toMatch(/__[Nn]ame__/);
    }
    expect(read("src/features/demo/feature.tsx")).toContain('path: "/demo"');
    expect(read("src/features/demo/feature.tsx")).toContain("<DemoPage />");
    expect(read("convex/demo/tables.ts")).toContain("export const demoTables");
    expect(read("convex/demo/queries.ts")).toContain('.query("demo")');
  });

  it("leaves convex/schema.ts untouched by default", () => {
    scaffold({ root, name: "demo" });
    expect(read("convex/schema.ts")).toBe(SCHEMA);
  });

  it("registers the tables in convex/schema.ts with registerSchema", () => {
    const { schemaRegistered } = scaffold({
      root,
      name: "demo",
      registerSchema: true,
    });
    expect(schemaRegistered).toBe(true);
    expect(read("convex/schema.ts"))
      .toBe(`import { defineSchema } from "convex/server";
import { notesTables } from "./notes/tables";
import { demoTables } from "./demo/tables";

export default defineSchema({
  ...notesTables,
  ...demoTables,
});
`);
  });

  it("refuses to run twice and changes nothing", () => {
    scaffold({ root, name: "demo" });
    const before = read("convex/demo/queries.ts");
    writeFileSync(join(root, "convex", "demo", "queries.ts"), "// edited\n");

    expect(() => scaffold({ root, name: "demo" })).toThrow(/już istnieje/);
    expect(read("convex/demo/queries.ts")).toBe("// edited\n");
    expect(before).not.toBe("// edited\n");
  });

  it("writes nothing when schema.ts has an unexpected layout", () => {
    writeFileSync(join(root, "convex", "schema.ts"), "export default {};\n");

    expect(() =>
      scaffold({ root, name: "demo", registerSchema: true }),
    ).toThrow(/convex\/schema\.ts/);
    expect(existsSync(join(root, "convex", "demo"))).toBe(false);
    expect(existsSync(join(root, "src", "features", "demo"))).toBe(false);
  });

  it("rejects an invalid name before touching the disk", () => {
    expect(() => scaffold({ root, name: "Bad-Name" })).toThrow(
      /Niepoprawna nazwa/,
    );
    expect(existsSync(join(root, "src", "features", "Bad-Name"))).toBe(false);
  });
});

describe("addToSchema", () => {
  it("is idempotent", () => {
    const once = addToSchema(SCHEMA, "demo");
    expect(addToSchema(once, "demo")).toBe(once);
  });
});

describe("parseArgs", () => {
  it("reads the name and the flag", () => {
    expect(parseArgs(["demo"])).toEqual({
      name: "demo",
      registerSchema: false,
    });
    expect(parseArgs(["demo", "--register-schema"])).toEqual({
      name: "demo",
      registerSchema: true,
    });
  });

  it("rejects a missing name, extra names and unknown flags", () => {
    expect(() => parseArgs([])).toThrow(/Użycie/);
    expect(() => parseArgs(["a", "b"])).toThrow(/Użycie/);
    expect(() => parseArgs(["demo", "--force"])).toThrow(/Nieznana opcja/);
  });
});

describe("isConvexConfigured", () => {
  it("detects the env var or the presence of .env.local without reading it", () => {
    expect(isConvexConfigured(root, {})).toBe(false);
    expect(isConvexConfigured(root, { CONVEX_DEPLOYMENT: "dev:x" })).toBe(true);
    writeFileSync(join(root, ".env.local"), "");
    expect(isConvexConfigured(root, {})).toBe(true);
  });
});
