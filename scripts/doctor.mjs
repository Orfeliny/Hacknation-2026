// Read-only readiness check for the hackathon morning. Prints PASS/FAIL per check and the fix
// command on FAIL; never prints a secret value or the contents of .env.local.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasCloudDeployment, parseGithubSlug } from "./setup-deploy.mjs";

const SECRETS = [
  "CONVEX_DEPLOY_KEY",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
];
const ENVIRONMENTS = ["production", "preview"];
const CHROMIUM_PATH_SNIPPET =
  "console.log(require('@playwright/test').chromium.executablePath())";

/**
 * @typedef {{ id: string, ok: boolean, fix?: string }} CheckResult
 * @typedef {{ status: number, stdout: string, stderr: string }} RunResult
 * @typedef {{
 *   run: (command: string, args: string[]) => RunResult,
 *   readFile: (path: string) => string | null,
 *   exists: (path: string) => boolean,
 *   home: string,
 *   nodeVersion: string,
 *   log: (line: string) => void,
 * }} Deps
 */

/** @param {string} version */
export const nodeMajor = (version) =>
  Number(version.replace(/^v/, "").split(".")[0]);

/** @param {string[]} argv */
export function parseArgs(argv) {
  const unknown = argv.filter((a) => a !== "--json");
  if (unknown.length > 0)
    throw new Error(`Nieznana opcja: ${unknown.join(", ")}. Dostępne: --json.`);
  return { json: argv.includes("--json") };
}

/** @param {string} stdout @returns {string[]} names from `gh secret list --json name` */
export function secretNames(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed)
      ? parsed.map((s) => s?.name).filter((n) => typeof n === "string")
      : [];
  } catch {
    return [];
  }
}

/** @param {string | null} projectJson */
export function vercelLinked(projectJson) {
  if (!projectJson) return false;
  try {
    const { projectId, orgId } = JSON.parse(projectJson);
    return Boolean(projectId) && Boolean(orgId);
  } catch {
    return false;
  }
}

/**
 * @param {Deps} deps
 * @returns {CheckResult[]}
 */
export function runChecks(deps) {
  const { run, readFile, exists, home, nodeVersion } = deps;
  /** @type {CheckResult[]} */
  const results = [];
  const add = (
    /** @type {string} */ id,
    /** @type {boolean} */ ok,
    /** @type {string} */ fix,
  ) => results.push(ok ? { id, ok } : { id, ok, fix });

  const wanted = nodeMajor(readFile(".nvmrc") ?? "");
  add(
    "node",
    Number.isFinite(wanted) && nodeMajor(nodeVersion) === wanted,
    `fnm use ${Number.isFinite(wanted) ? wanted : 24} (albo nvm use)`,
  );

  add("gh-auth", run("gh", ["auth", "status"]).status === 0, "gh auth login");

  const origin = run("git", ["remote", "get-url", "origin"]);
  const slug = origin.status === 0 ? parseGithubSlug(origin.stdout) : null;
  add(
    "gh-repo",
    slug !== null &&
      run("gh", ["repo", "view", slug, "--json", "name"]).status === 0,
    "git remote add origin <url-repo-na-github> oraz gh auth login",
  );

  add(
    "convex-login",
    exists(join(home, ".convex", "config.json")),
    "npx convex login",
  );
  add(
    "convex-deployment",
    hasCloudDeployment(readFile(".env.local")),
    "npx convex dev --once --configure existing",
  );

  add(
    "vercel-link",
    vercelLinked(readFile(join(".vercel", "project.json"))),
    "npx vercel link",
  );

  for (const env of ENVIRONMENTS) {
    const listed = slug
      ? run("gh", [
          "secret",
          "list",
          "--env",
          env,
          "--repo",
          slug,
          "--json",
          "name",
        ])
      : { status: 1, stdout: "", stderr: "" };
    const names = listed.status === 0 ? secretNames(listed.stdout) : [];
    const missing = SECRETS.filter((s) => !names.includes(s));
    add(
      `secrets-${env}`,
      listed.status === 0 && missing.length === 0,
      env === "production"
        ? "npm run setup:deploy"
        : `gh secret set <NAZWA> --env ${env} (brakuje: ${missing.join(", ") || "dostępu do repo"})`,
    );
  }

  const chromium = run(process.execPath, ["-e", CHROMIUM_PATH_SNIPPET]);
  const chromiumPath = chromium.status === 0 ? chromium.stdout.trim() : "";
  add(
    "playwright-chromium",
    chromiumPath !== "" && exists(chromiumPath),
    "npx playwright install chromium",
  );

  return results;
}

/**
 * @param {string[]} argv
 * @param {Deps} deps
 * @returns {number} exit code
 */
export function runDoctor(argv, deps) {
  const { log } = deps;
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    return 2;
  }
  const results = runChecks(deps);
  if (options.json) log(JSON.stringify(results, null, 2));
  else
    for (const r of results)
      log(r.ok ? `PASS  ${r.id}` : `FAIL  ${r.id}\n      napraw: ${r.fix}`);
  return results.every((r) => r.ok) ? 0 : 1;
}

if (realpathSync(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  process.exit(
    runDoctor(process.argv.slice(2), {
      run: (command, args) => {
        const r = spawnSync(command, args, {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        });
        if (r.error)
          return { status: 127, stdout: "", stderr: r.error.message };
        return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
      },
      readFile: (path) =>
        existsSync(path) ? readFileSync(path, "utf8") : null,
      exists: existsSync,
      home: homedir(),
      nodeVersion: process.version,
      log: (line) => console.log(line),
    }),
  );
}
