import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  type writeFileSync as WriteFile,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addToSchema,
  isConvexConfigured,
  nextSteps,
  parseArgs,
  planFiles,
  scaffold,
  validateName,
} from "./feature.mjs";
import { classify, loadHotFiles } from "./lib/hot-files.mjs";

const SCHEMA = `import { defineSchema } from "convex/server";
import { notesTables } from "./notes/tables";

export default defineSchema({
  ...notesTables,
});
`;

const REAL_HOT_FILES = join(
  import.meta.dirname,
  "..",
  ".github",
  "hot-files.txt",
);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "feature-test-"));
  mkdirSync(join(root, "convex", "notes"), { recursive: true });
  mkdirSync(join(root, "src", "features", "notes"), { recursive: true });
  mkdirSync(join(root, ".github"));
  copyFileSync(REAL_HOT_FILES, join(root, ".github", "hot-files.txt"));
  writeFileSync(join(root, "convex", "schema.ts"), SCHEMA);
  writeFileSync(
    join(root, "convex", "notes", "tables.ts"),
    "export const notesTables = { notes: defineTable({}) };\n",
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const read = (file: string) => readFileSync(join(root, file), "utf8");
const exists = (file: string) => existsSync(join(root, file));
const contract = (name = "demo") => scaffold({ root, name, mode: "contract" });
const feature = (name = "demo") => scaffold({ root, name, mode: "feature" });

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
    "con",
    "nul",
    "com1",
    "lpt9",
    "../x",
    "C:\\x",
    "/abs",
    "zażółć",
    "demo.",
    "demo ",
  ])("rejects %j with a Polish message", (name) => {
    expect(validateName(root, name)).toMatch(/Niepoprawna nazwa/);
  });

  it.each(["lib", "schema", "http", "crons", "auth"])(
    "rejects reserved word %s",
    (name) => {
      expect(validateName(root, name)).toMatch(/zarezerwowana/);
    },
  );

  it("rejects an existing feature", () => {
    expect(validateName(root, "notes")).toMatch(/już istnieje/);
  });

  it("rejects a clash with a convex/<name>.ts module", () => {
    writeFileSync(join(root, "convex", "jobs.ts"), "");
    expect(validateName(root, "jobs")).toMatch(/już istnieje/);
  });

  it("rejects a table already defined in another feature (contract only)", () => {
    mkdirSync(join(root, "convex", "other"));
    writeFileSync(
      join(root, "convex", "other", "tables.ts"),
      "export const otherTables = { tasks: defineTable({}) };\n",
    );
    expect(validateName(root, "tasks", "contract")).toMatch(/już zdefiniowana/);
  });
});

describe("hot/normal split", () => {
  it("default mode writes only normal files, --contract only hot ones", () => {
    const patterns = loadHotFiles(REAL_HOT_FILES);
    const plan = planFiles(root, "demo");

    expect(plan.contract.length).toBeGreaterThan(0);
    for (const { target } of plan.feature) {
      expect(classify(target, patterns)).toBe("normal");
    }
    for (const { target } of plan.contract) {
      expect(classify(target, patterns)).toBe("hot");
    }
    expect(plan.contract.map((f) => f.target)).toEqual([
      "convex/demo/tables.ts",
    ]);
  });
});

describe("scaffold --contract", () => {
  it("writes only the hot file and registers the table in schema.ts", () => {
    const { created, schemaChanged } = contract();

    expect(created).toEqual(["convex/demo/tables.ts"]);
    expect(schemaChanged).toBe(true);
    expect(read("convex/demo/tables.ts")).toContain("export const demoTables");
    expect(exists("src/features/demo")).toBe(false);
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

  it("refuses a second run and changes nothing", () => {
    contract();
    const schema = read("convex/schema.ts");
    expect(() => contract()).toThrow(/już istnieje/);
    expect(read("convex/schema.ts")).toBe(schema);
  });

  it("writes nothing when schema.ts has an unexpected layout", () => {
    writeFileSync(join(root, "convex", "schema.ts"), "export default {};\n");
    expect(() => contract()).toThrow(/convex\/schema\.ts/);
    expect(exists("convex/demo")).toBe(false);
  });

  it("rolls back created files and schema.ts when a write fails midway", () => {
    let calls = 0;
    const failing = ((...args: Parameters<typeof WriteFile>) => {
      if (++calls === 2) {
        writeFileSync(join(root, "convex", "schema.ts"), "import { defi");
        throw new Error("disk full");
      }
      return writeFileSync(...args);
    }) as typeof WriteFile;

    expect(() =>
      scaffold({ root, name: "demo", mode: "contract", write: failing }),
    ).toThrow(/disk full/);
    expect(exists("convex/demo")).toBe(false);
    expect(read("convex/schema.ts")).toBe(SCHEMA);
  });
});

describe("scaffold (feature mode)", () => {
  it("refuses without the contract and writes nothing", () => {
    expect(() => feature()).toThrow(/najpierw scal PR kontraktowy/);
    expect(exists("src/features/demo")).toBe(false);
  });

  it("refuses when tables.ts exists but schema.ts does not register it", () => {
    mkdirSync(join(root, "convex", "demo"));
    writeFileSync(join(root, "convex", "demo", "tables.ts"), "");
    expect(() => feature()).toThrow(/najpierw scal PR kontraktowy/);
  });

  it("writes only normal files after the contract, from templates", () => {
    contract();
    const schema = read("convex/schema.ts");
    const { created, schemaChanged } = feature();

    expect(schemaChanged).toBe(false);
    expect(read("convex/schema.ts")).toBe(schema);
    expect(created.sort()).toEqual(
      [
        "convex/demo/actions.ts",
        "convex/demo/demo.test.ts",
        "convex/demo/limits.ts",
        "convex/demo/mutations.ts",
        "convex/demo/queries.ts",
        "src/features/demo/DemoForm.tsx",
        "src/features/demo/DemoPage.tsx",
        "src/features/demo/demo.test.tsx",
        "src/features/demo/feature.tsx",
        "src/features/demo/schema.ts",
      ].sort(),
    );
    for (const file of created) expect(read(file)).not.toMatch(/__[Nn]ame__/);
    expect(read("src/features/demo/feature.tsx")).toContain('path: "/demo"');
    expect(read("convex/demo/queries.ts")).toContain('.query("demo")');
  });

  it("refuses a second run and keeps edited files", () => {
    contract();
    feature();
    writeFileSync(join(root, "convex", "demo", "queries.ts"), "// edited\n");
    expect(() => feature()).toThrow(/już istnieje/);
    expect(read("convex/demo/queries.ts")).toBe("// edited\n");
  });

  it("refuses when only the convex dir pre-exists with a stray file", () => {
    contract();
    writeFileSync(join(root, "convex", "demo", "queries.ts"), "// mine\n");
    expect(() => feature()).toThrow(/Odmawiam nadpisania/);
    expect(read("convex/demo/queries.ts")).toBe("// mine\n");
    expect(exists("src/features/demo")).toBe(false);
  });

  it("refuses when only the src dir pre-exists", () => {
    contract();
    mkdirSync(join(root, "src", "features", "demo"));
    expect(() => feature()).toThrow(/już istnieje/);
    expect(exists("convex/demo/queries.ts")).toBe(false);
  });

  it("rolls back newly created directories when a write fails, keeping the contract", () => {
    contract();
    let calls = 0;
    const failing = ((...args: Parameters<typeof WriteFile>) => {
      if (++calls === 7) throw new Error("boom");
      return writeFileSync(...args);
    }) as typeof WriteFile;

    expect(() =>
      scaffold({ root, name: "demo", mode: "feature", write: failing }),
    ).toThrow(/boom/);
    expect(exists("src/features/demo")).toBe(false);
    expect(exists("convex/demo/queries.ts")).toBe(false);
    expect(exists("convex/demo/tables.ts")).toBe(true);
  });
});

describe("addToSchema", () => {
  it("is idempotent", () => {
    const once = addToSchema(SCHEMA, "demo");
    expect(addToSchema(once, "demo")).toBe(once);
  });

  it("throws on a one-line defineSchema instead of producing broken code", () => {
    const oneLine = `import { notesTables } from "./notes/tables";\nexport default defineSchema({ ...notesTables });\n`;
    expect(() => addToSchema(oneLine, "demo")).toThrow(/Nie rozpoznaję układu/);
  });

  it("anchors on defineSchema, not on a later `});`", () => {
    const withHelper = `${SCHEMA}\nexport const x = f({\n});\n`;
    const result = addToSchema(withHelper, "demo");
    expect(result).toContain("  ...notesTables,\n  ...demoTables,\n});\n");
    expect(result.endsWith("export const x = f({\n});\n")).toBe(true);
    expect(result.split("...demoTables").length - 1).toBe(1);
  });

  it("anchors correctly when the helper comes before defineSchema", () => {
    const helperFirst = SCHEMA.replace(
      "export default",
      "const x = f({\n});\n\nexport default",
    );
    const result = addToSchema(helperFirst, "demo");
    expect(result).toContain("  ...notesTables,\n  ...demoTables,\n});\n");
  });
});

describe("nextSteps", () => {
  it("feature mode needs codegen and the _generated path like contract mode", () => {
    for (const mode of ["feature", "contract"] as const) {
      const skipped = nextSteps({ mode, name: "demo", codegen: "skipped" });
      expect(skipped.steps[0]).toMatch(/^npx convex codegen/);
      expect(skipped.steps[0]).toContain("convex/_generated");
      expect(skipped.addPaths).toEqual([]);

      const ok = nextSteps({ mode, name: "demo", codegen: "ok" });
      expect(ok.addPaths).toEqual(["convex/_generated"]);
      expect(ok.steps).not.toContain("npx convex codegen");

      const failed = nextSteps({ mode, name: "demo", codegen: "failed" });
      expect(failed.steps[0]).toMatch(/^npx convex codegen/);
    }
  });

  it("tells which PR it is", () => {
    expect(
      nextSteps({ mode: "contract", name: "demo", codegen: "ok" }).pr,
    ).toMatch(/KONTRAKTOWY/);
    expect(
      nextSteps({ mode: "feature", name: "demo", codegen: "ok" }).pr,
    ).toMatch(/PR FUNKCJI/);
  });

  it("keeps _generated exempt from the hot/normal split", () => {
    const patterns = loadHotFiles(REAL_HOT_FILES);
    expect(classify("convex/_generated/api.d.ts", patterns)).toBe("exempt");
  });
});

describe("parseArgs", () => {
  it("selects feature mode by default and contract mode with the flag", () => {
    expect(parseArgs(["demo"])).toEqual({ name: "demo", mode: "feature" });
    expect(parseArgs(["demo", "--contract"])).toEqual({
      name: "demo",
      mode: "contract",
    });
  });

  it("rejects a missing name, extra names and unknown flags (incl. the old one)", () => {
    expect(() => parseArgs([])).toThrow(/Użycie/);
    expect(() => parseArgs(["a", "b"])).toThrow(/Użycie/);
    expect(() => parseArgs(["demo", "--register-schema"])).toThrow(
      /Nieznana opcja/,
    );
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
