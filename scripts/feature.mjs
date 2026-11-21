// Scaffolds a new feature (src/features/<name>/ + convex/<name>/) from string templates. No LLM, no network.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { classify, loadHotFiles } from "./lib/hot-files.mjs";
import { CONVEX_BIN } from "./lib/proc.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(SCRIPT_DIR, "templates");
const NAME_PATTERN = /^[a-z][a-z0-9]{1,23}$/;

// Directory names that are shared code, tooling or generated, plus words that clash with Convex or the router.
const DEVICE_NAME = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/;

const RESERVED = new Set([
  "ai",
  "api",
  "app",
  "components",
  "convex",
  "default",
  "e2e",
  "features",
  "auth",
  "crons",
  "generated",
  "http",
  "index",
  "internal",
  "lib",
  "node",
  "public",
  "routes",
  "schema",
  "server",
  "src",
  "test",
  "tests",
  "ui",
  "values",
]);

const USAGE = `Użycie (dwa PR-y, patrz docs/architecture.md):
  1. node scripts/feature.mjs <nazwa> --contract   PR kontraktowy: tylko pliki wspólne (convex/<nazwa>/tables.ts,
                                                   wpis w convex/schema.ts, convex/_generated). Zaznacz pole w szablonie PR.
  2. node scripts/feature.mjs <nazwa>              PR funkcji, po scaleniu kontraktu: pozostałe pliki.

  <nazwa>  małe litery i cyfry, zaczyna się od litery, 2-24 znaków (np. tasks)`;

/** @param {string} root */
const hotPatterns = (root) =>
  loadHotFiles(join(root, ".github", "hot-files.txt"));

/** @param {string} root @param {string} name */
function otherModuleClash(root, name) {
  return ["ts", "js"].some((ext) =>
    existsSync(join(root, "convex", `${name}.${ext}`)),
  );
}

/** @param {string} root @param {string} name */
function tableDefinedElsewhere(root, name) {
  const convexDir = join(root, "convex");
  if (!existsSync(convexDir)) return false;
  const pattern = new RegExp(`\\b${name}\\s*:\\s*defineTable`);
  return readdirSync(convexDir, { withFileTypes: true }).some((entry) => {
    const file = join(convexDir, entry.name, "tables.ts");
    return (
      entry.isDirectory() &&
      existsSync(file) &&
      pattern.test(readFileSync(file, "utf8"))
    );
  });
}

/**
 * @param {string} root repository root
 * @param {string} name
 * @param {"contract" | "feature"} [mode]
 * @returns {string | null} a Polish error message, or null when the name is usable
 */
export function validateName(root, name, mode = "contract") {
  if (!NAME_PATTERN.test(name) || DEVICE_NAME.test(name)) {
    return (
      `Niepoprawna nazwa funkcji „${name}”. Użyj 2-24 małych liter i cyfr, zaczynając od litery ` +
      "(bez myślników i podkreśleń: nazwa katalogu staje się częścią API Convex; nazwy urządzeń Windows jak con, nul są zabronione)."
    );
  }
  if (RESERVED.has(name)) {
    return `Nazwa „${name}” jest zarezerwowana (kod wspólny lub słowo kluczowe). Wybierz inną.`;
  }
  const dirs =
    mode === "contract"
      ? [join("src", "features", name), join("convex", name)]
      : [join("src", "features", name)];
  const existing = dirs.filter((dir) => existsSync(join(root, dir)));
  if (otherModuleClash(root, name)) existing.push(`convex/${name}.ts`);
  if (existing.length > 0) {
    return `Funkcja „${name}” już istnieje (${existing.join(", ")}). Nic nie zostało zmienione.`;
  }
  if (mode === "contract" && tableDefinedElsewhere(root, name)) {
    return `Tabela „${name}” jest już zdefiniowana w innym convex/*/tables.ts. Wybierz inną nazwę.`;
  }
  return null;
}

/**
 * @param {string} dir
 * @returns {string[]} file paths relative to dir, with forward slashes
 */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(dir, join(entry.parentPath, entry.name)).replaceAll("\\", "/"),
    );
}

/**
 * @param {string} text
 * @param {string} name
 */
function render(text, name) {
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  return text.replaceAll("__Name__", pascal).replaceAll("__name__", name);
}

/**
 * Adds the feature's tables to convex/schema.ts. Throws when the file has an unexpected shape.
 * @param {string} source
 * @param {string} name
 */
export function addToSchema(source, name) {
  const importLine = `import { ${name}Tables } from "./${name}/tables";`;
  if (source.includes(importLine)) return source;
  const importLines = [
    ...source.matchAll(/^import .+ from "\.\/.+\/tables";$/gm),
  ];
  const lastImport = importLines.at(-1);
  const unrecognised = new Error(
    "Nie rozpoznaję układu convex/schema.ts. Dopisz ręcznie import i rozwinięcie tabel.",
  );
  const call = defineSchemaRange(source);
  if (!lastImport || !call) throw unrecognised;
  const importEnd = lastImport.index + lastImport[0].length;
  if (importEnd > call.open) throw unrecognised;
  if (!/[,{]\n$/.test(source.slice(0, call.close))) throw unrecognised;

  const result =
    source.slice(0, importEnd) +
    "\n" +
    importLine +
    source.slice(importEnd, call.close) +
    `  ...${name}Tables,\n` +
    source.slice(call.close);

  const after = defineSchemaRange(result);
  const spread = `...${name}Tables`;
  const occurrences = (/** @type {string} */ text, /** @type {string} */ n) =>
    text.split(n).length - 1;
  if (
    !after ||
    occurrences(result, importLine) !== 1 ||
    occurrences(result.slice(after.open, after.close), spread) !== 1
  ) {
    throw unrecognised;
  }
  return result;
}

/**
 * Offsets of the braces of the first `defineSchema({ ... })` call, matched by depth.
 * @param {string} source
 * @returns {{ open: number, close: number } | null}
 */
function defineSchemaRange(source) {
  const call = /defineSchema\(\{/.exec(source);
  if (!call) return null;
  const open = call.index + call[0].length - 1;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return { open, close: i };
  }
  return null;
}

/**
 * True when a Convex deployment seems configured. Only checks that the settings exist and never reads their content.
 * @param {string} root
 * @param {Record<string, string | undefined>} env
 */
export function isConvexConfigured(root, env) {
  return Boolean(env.CONVEX_DEPLOYMENT) || existsSync(join(root, ".env.local"));
}

/**
 * Splits the template files into hot (contract PR) and normal (feature PR) using the repo's hot-files list.
 * @param {string} root
 * @param {string} name
 */
export function planFiles(root, name) {
  const patterns = hotPatterns(root);
  const all = listFiles(TEMPLATE_DIR).map((file) => {
    const target = render(file.replace(/\.tpl$/, ""), name);
    return {
      target,
      content: render(readFileSync(join(TEMPLATE_DIR, file), "utf8"), name),
      hot: classify(target, patterns) === "hot",
    };
  });
  return {
    contract: all.filter((f) => f.hot),
    feature: all.filter((f) => !f.hot),
  };
}

/** @param {string} path nearest ancestor of `path` (or itself) that does not exist yet, as the topmost new dir */
function topmostMissingDir(path) {
  let top = "";
  for (let dir = path; !existsSync(dir); dir = dirname(dir)) top = dir;
  return top;
}

/**
 * @param {{ root: string, name: string, mode: "contract" | "feature", write?: typeof writeFileSync }} options
 * @returns {{ created: string[], schemaChanged: boolean }}
 */
export function scaffold({ root, name, mode, write = writeFileSync }) {
  const problem = validateName(root, name, mode);
  if (problem) throw new Error(problem);

  const schemaPath = join(root, "convex", "schema.ts");
  const originalSchema = readFileSync(schemaPath, "utf8");
  if (mode === "feature") {
    if (
      !existsSync(join(root, "convex", name, "tables.ts")) ||
      !originalSchema.includes(`...${name}Tables`)
    ) {
      throw new Error(
        `Brakuje kontraktu dla „${name}” (convex/${name}/tables.ts i wpis w convex/schema.ts): ` +
          `najpierw scal PR kontraktowy: node scripts/feature.mjs ${name} --contract`,
      );
    }
  }

  const plan = planFiles(root, name)[mode];
  const clash = plan.filter(({ target }) => existsSync(join(root, target)));
  if (clash.length > 0) {
    throw new Error(
      `Odmawiam nadpisania istniejących plików: ${clash.map((f) => f.target).join(", ")}.`,
    );
  }
  const nextSchema =
    mode === "contract" ? addToSchema(originalSchema, name) : originalSchema;

  const newDirs = new Set(
    plan
      .map(({ target }) => topmostMissingDir(dirname(join(root, target))))
      .filter(Boolean),
  );
  /** @type {string[]} */
  const written = [];
  try {
    for (const { target, content } of plan) {
      const path = join(root, target);
      mkdirSync(dirname(path), { recursive: true });
      write(path, content, { flag: "wx" });
      written.push(path);
    }
    if (nextSchema !== originalSchema) write(schemaPath, nextSchema);
  } catch (error) {
    for (const path of written) rmSync(path, { force: true });
    for (const dir of newDirs) rmSync(dir, { recursive: true, force: true });
    writeFileSync(schemaPath, originalSchema);
    throw error;
  }

  return {
    created: plan.map((f) => f.target),
    schemaChanged: nextSchema !== originalSchema,
  };
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith("--"));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const unknown = flags.filter((f) => f !== "--contract");
  if (unknown.length > 0 || positional.length !== 1) {
    throw new Error(
      unknown.length > 0
        ? `Nieznana opcja: ${unknown.join(", ")}\n${USAGE}`
        : USAGE,
    );
  }
  return {
    name: /** @type {string} */ (positional[0]),
    mode: /** @type {"contract" | "feature"} */ (
      flags.includes("--contract") ? "contract" : "feature"
    ),
  };
}

/**
 * Post-scaffold guidance. `convex/_generated` is exempt from the hot/normal split, so it belongs in both PRs.
 * @param {{ mode: "contract" | "feature", name: string, codegen: "ok" | "failed" | "skipped" }} options
 */
export function nextSteps({ mode, name, codegen }) {
  const steps = [];
  if (codegen === "failed") {
    steps.push(
      "npx convex codegen   # po poprawieniu błędu; dodaj convex/_generated do commita",
    );
  } else if (codegen === "skipped") {
    steps.push(
      "npx convex codegen   # wymaga wdrożenia (npx convex dev --once); dodaj convex/_generated do commita",
    );
  }
  steps.push("npm run codegen:check", "npm run verify");
  const pr =
    mode === "contract"
      ? "To jest PR KONTRAKTOWY (pliki wspólne): w szablonie PR zaznacz pole " +
        "„Zmiana plików wspólnych uzgodniona z zespołem”. Po jego scaleniu uruchom: " +
        `node scripts/feature.mjs ${name}`
      : "To jest PR FUNKCJI (zwykłe pliki, pola plików wspólnych nie zaznaczaj). " +
        "Bez zregenerowanego convex/_generated nie istnieje api.<nazwa>.* i typecheck nie przejdzie.";
  return {
    addPaths: codegen === "ok" ? ["convex/_generated"] : [],
    steps,
    pr,
  };
}

/** @param {string[]} argv */
function main(argv) {
  const root = resolve(SCRIPT_DIR, "..");
  let result;
  let args;
  try {
    args = parseArgs(argv);
    result = scaffold({ root, ...args });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const { name, mode } = args;
  const adds = [...result.created];
  if (result.schemaChanged) adds.push("convex/schema.ts");
  console.log(`Utworzono pliki funkcji „${name}”:`);
  for (const file of result.created) console.log(`  + ${file}`);
  if (result.schemaChanged) console.log("  ~ convex/schema.ts");

  /** @type {"ok" | "failed" | "skipped"} */
  let codegen = "skipped";
  if (isConvexConfigured(root, process.env)) {
    console.log("\nUruchamiam `npx convex codegen`...");
    const run = spawnSync(process.execPath, [CONVEX_BIN, "codegen"], {
      cwd: root,
      stdio: "inherit",
      env: { CONVEX_AGENT_MODE: "anonymous", ...process.env },
    });
    codegen = run.status === 0 ? "ok" : "failed";
  }

  const guide = nextSteps({ mode, name, codegen });
  adds.push(...guide.addPaths);
  console.log(`\n${guide.pr}`);
  console.log(`\ngit add ${adds.join(" ")}`);
  if (codegen === "failed") {
    console.error("\n`npx convex codegen` nie powiódł się.");
  }
  console.log(
    `\nKolejne kroki:\n${guide.steps.map((step) => `  ${step}`).join("\n")}`,
  );
  if (codegen === "failed") process.exit(1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2));
}
