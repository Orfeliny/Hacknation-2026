// CI helper: decides whether a PR touches only documentation, so the heavy verify steps can be skipped.
import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DOC_PATH = /^(docs|specs)\/|\.md$/u;

/**
 * Empty diffs and anything under `.github/` are never docs-only, so a workflow edit always gets full CI.
 * @param {string[]} files
 */
export const isDocsOnly = (files) =>
  files.length > 0 &&
  files.every(
    (f) => !f.startsWith(".github/") && !f.includes("..") && DOC_PATH.test(f),
  );

const main = () => {
  const files = readFileSync(0, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const line = `docs_only=${isDocsOnly(files)}`;
  console.log(line);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
};

if (realpathSync(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main();
}
