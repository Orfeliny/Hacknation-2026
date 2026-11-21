// Scaffolds a new feature (src/features/<name>/ + convex/<name>/) from string templates. No LLM, no network.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CONVEX_BIN } from "./lib/proc.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(SCRIPT_DIR, "templates");
const NAME_PATTERN = /^[a-z][a-z0-9]{1,23}$/;

// Directory names that are shared code, tooling or generated, plus words that clash with Convex or the router.
const RESERVED = new Set([
  "ai",
  "api",
  "app",
  "components",
  "convex",
  "default",
  "e2e",
  "features",
  "generated",
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

const USAGE = `Użycie:
  npm run feature:new -- <nazwa> [--register-schema]

  <nazwa>             małe litery i cyfry, zaczyna się od litery, 2-24 znaków (np. tasks)
  --register-schema   dopisuje import i rozwinięcie tabel do convex/schema.ts (plik wspólny)`;

/**
 * @param {string} root repository root
 * @param {string} name
 * @returns {string | null} a Polish error message, or null when the name is usable
 */
export function validateName(root, name) {
  if (!NAME_PATTERN.test(name)) {
    return (
      `Niepoprawna nazwa funkcji „${name}”. Użyj 2-24 małych liter i cyfr, zaczynając od litery ` +
      "(bez myślników i podkreśleń: nazwa katalogu staje się częścią API Convex)."
    );
  }
  if (RESERVED.has(name)) {
    return `Nazwa „${name}” jest zarezerwowana (kod wspólny lub słowo kluczowe). Wybierz inną.`;
  }
  const existing = [join("src", "features", name), join("convex", name)].filter(
    (dir) => existsSync(join(root, dir)),
  );
  if (existing.length > 0) {
    return `Funkcja „${name}” już istnieje (${existing.join(", ")}). Nic nie zostało zmienione.`;
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
  const close = source.lastIndexOf("});");
  if (!lastImport || close === -1) {
    throw new Error(
      "Nie rozpoznaję układu convex/schema.ts. Dopisz ręcznie import i rozwinięcie tabel.",
    );
  }
  const importEnd = lastImport.index + lastImport[0].length;
  return (
    source.slice(0, importEnd) +
    "\n" +
    importLine +
    source.slice(importEnd, close) +
    `  ...${name}Tables,\n` +
    source.slice(close)
  );
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
 * @param {{ root: string, name: string, registerSchema?: boolean }} options
 * @returns {{ created: string[], schemaRegistered: boolean }}
 */
export function scaffold({ root, name, registerSchema = false }) {
  const problem = validateName(root, name);
  if (problem) throw new Error(problem);

  const plan = listFiles(TEMPLATE_DIR).map((file) => ({
    target: render(file.replace(/\.tpl$/, ""), name),
    content: render(readFileSync(join(TEMPLATE_DIR, file), "utf8"), name),
  }));
  const clash = plan.filter(({ target }) => existsSync(join(root, target)));
  if (clash.length > 0) {
    throw new Error(
      `Odmawiam nadpisania istniejących plików: ${clash.map((f) => f.target).join(", ")}.`,
    );
  }

  const schemaPath = join(root, "convex", "schema.ts");
  const nextSchema = registerSchema
    ? addToSchema(readFileSync(schemaPath, "utf8"), name)
    : undefined;

  for (const { target, content } of plan) {
    const path = join(root, target);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, { flag: "wx" });
  }
  if (nextSchema !== undefined) writeFileSync(schemaPath, nextSchema);

  return {
    created: plan.map((f) => f.target),
    schemaRegistered: nextSchema !== undefined,
  };
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith("--"));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const unknown = flags.filter((f) => f !== "--register-schema");
  if (unknown.length > 0 || positional.length !== 1) {
    throw new Error(
      unknown.length > 0
        ? `Nieznana opcja: ${unknown.join(", ")}\n${USAGE}`
        : USAGE,
    );
  }
  return {
    name: /** @type {string} */ (positional[0]),
    registerSchema: flags.includes("--register-schema"),
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

  const { name } = args;
  console.log(`Utworzono funkcję „${name}”:`);
  for (const file of result.created) console.log(`  + ${file}`);

  if (!result.schemaRegistered) {
    console.log(
      "\nconvex/schema.ts jest plikiem wspólnym i nie został zmieniony. Dopisz w nim (w PR kontraktowym):\n" +
        `  import { ${name}Tables } from "./${name}/tables";\n` +
        `  ...${name}Tables,   // w defineSchema({ ... })\n` +
        "(przy następnej funkcji możesz dodać --register-schema, żeby zrobiło to za Ciebie).\n" +
        "Bez tego typecheck i testy backendu nowej funkcji nie przejdą.",
    );
  }

  const configured = isConvexConfigured(root, process.env);
  if (result.schemaRegistered && configured) {
    console.log("\nUruchamiam `npx convex codegen`...");
    const codegen = spawnSync(process.execPath, [CONVEX_BIN, "codegen"], {
      cwd: root,
      stdio: "inherit",
    });
    if (codegen.status === 0) {
      console.log(
        "Gotowe. Sprawdź: npm run codegen:check, potem npm run verify.",
      );
      return;
    }
    console.error("`npx convex codegen` nie powiódł się, uruchom go ręcznie.");
  }
  console.log(
    "\nKolejne kroki:\n" +
      "  npx convex codegen      # wymaga skonfigurowanego wdrożenia (npx convex dev --once)\n" +
      "  npm run codegen:check\n" +
      "  npm run verify",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2));
}
