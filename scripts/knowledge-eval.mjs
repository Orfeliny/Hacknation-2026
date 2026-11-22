#!/usr/bin/env node
// Measures how well the knowledge base finds the right source (RAG-6, issue #121).
//
// It asks the deployed `knowledge/search:searchKnowledge` (an internal action, run through the Convex CLI) for
// every question in knowledge-eval-questions.json with the cut-off lowered to 0, so every score is visible,
// then prints top-1 / top-3 hit rates and, for several thresholds, how many questions would be answered
// correctly, answered wrongly, or correctly refused.
//
// Needs a deployment with the corpus indexed and published and a real embedding server (see docs/rag.md).
// It talks only to the deployment the Convex CLI points at; no keys are read.
//
//   node scripts/knowledge-eval.mjs [--json] [--office] [--questions path] [--thresholds 0.4,0.5,0.55]
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const CONVEX_BIN = fileURLToPath(
  new URL("../node_modules/convex/bin/main.js", import.meta.url),
);

/**
 * @typedef {{ id: string, kind: string, q: string, acts?: string[], ref?: string, needsOfficeDoc?: boolean }} Question
 * @typedef {{ title: string, locator: string, score: number }} Hit
 * @typedef {{ question: Question, skipped: boolean, hits: Hit[], top1: boolean, top3: boolean,
 *   ref1: boolean | null, ref3: boolean | null, best: number }} Result
 */

const args = process.argv.slice(2);
/** @param {string} name */
const flag = (name) => args.includes(name);
/**
 * @param {string} name
 * @param {string} fallback
 */
const option = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? (args[at + 1] ?? fallback) : fallback;
};

/**
 * "Dz.U. 2008 poz. 1505" becomes "2008/1505"; "gov.pl: Ocena okresowa" becomes "gov:ocena-okresowa".
 * @param {string} title
 */
export function actOf(title) {
  const dz = /Dz\.U\.\s*(\d{4})\s*poz\.\s*(\d+)/.exec(title);
  if (dz) return `${dz[1]}/${dz[2]}`;
  const gov = /^gov\.pl:\s*(.+)$/i.exec(title);
  if (gov) {
    const slug = (gov[1] ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
    return `gov:${slug}`;
  }
  return title;
}

/** @param {string} text */
const norm = (text) => text.replace(/\s+/g, " ");

/**
 * @param {Question} question
 * @param {Hit[]} hits
 * @returns {Omit<Result, "question" | "skipped" | "hits">}
 */
export function judge(question, hits) {
  const acts = hits.map((hit) => actOf(hit.title));
  const wanted = question.acts ?? [];
  const at = acts.findIndex((act) => wanted.includes(act));
  const refAt = question.ref
    ? hits.findIndex(
        (hit) =>
          wanted.includes(actOf(hit.title)) &&
          norm(hit.locator).includes(question.ref ?? ""),
      )
    : -1;
  return {
    top1: at === 0,
    top3: at >= 0 && at < 3,
    ref1: question.ref ? refAt === 0 : null,
    ref3: question.ref ? refAt >= 0 && refAt < 3 : null,
    best: hits[0]?.score ?? 0,
  };
}

/** @param {string} question */
async function search(question) {
  const { stdout } = await run(
    process.execPath,
    [
      CONVEX_BIN,
      "run",
      "knowledge/search:searchKnowledge",
      JSON.stringify({ question, minScore: 0 }),
    ],
    { maxBuffer: 16 * 1024 * 1024, env: process.env },
  );
  /** @type {Hit[]} */
  return JSON.parse(stdout.slice(stdout.indexOf("[")));
}

/**
 * @param {number} n
 * @param {number} total
 */
const pct = (n, total) =>
  total === 0 ? "-" : `${Math.round((100 * n) / total)}%`;

async function main() {
  const questionsPath = option(
    "--questions",
    fileURLToPath(new URL("./knowledge-eval-questions.json", import.meta.url)),
  );
  const thresholds = option("--thresholds", "0.4,0.45,0.5,0.55,0.6,0.65,0.7")
    .split(",")
    .map(Number);
  /** @type {{ questions: Question[] }} */
  const set = JSON.parse(await readFile(questionsPath, "utf8"));

  /** @type {Result[]} */
  const results = [];
  for (const question of set.questions) {
    if (question.needsOfficeDoc && !flag("--office")) {
      results.push({
        question,
        skipped: true,
        hits: [],
        top1: false,
        top3: false,
        ref1: null,
        ref3: null,
        best: 0,
      });
      continue;
    }
    const hits = await search(question.q);
    results.push({
      question,
      skipped: false,
      hits,
      ...judge(question, hits),
    });
    process.stderr.write(
      `${question.id} ${question.kind} ${(hits[0]?.score ?? 0).toFixed(3)}\n`,
    );
  }

  const answerable = results.filter(
    (r) => !r.skipped && r.question.kind !== "out",
  );
  const out = results.filter((r) => !r.skipped && r.question.kind === "out");
  const refChecked = answerable.filter((r) => r.ref1 !== null);
  const report = {
    questions: results.length,
    skipped: results.filter((r) => r.skipped).length,
    answerable: answerable.length,
    outOfCorpus: out.length,
    top1: answerable.filter((r) => r.top1).length,
    top3: answerable.filter((r) => r.top3).length,
    ref1: refChecked.filter((r) => r.ref1).length,
    ref3: refChecked.filter((r) => r.ref3).length,
    refChecked: refChecked.length,
    thresholds: thresholds.map((threshold) => {
      const answered = answerable.filter((r) => r.best >= threshold);
      return {
        threshold,
        answeredCorrect: answered.filter((r) => r.top1).length,
        answeredWrong: answered.filter((r) => !r.top1).length,
        wronglyRefused: answerable.filter((r) => r.best < threshold && r.top3)
          .length,
        refusedCorrectly: out.filter((r) => r.best < threshold).length,
        answeredOutOfCorpus: out.filter((r) => r.best >= threshold).length,
      };
    }),
    misses: answerable
      .filter((r) => !r.top3)
      .map((r) => ({
        id: r.question.id,
        q: r.question.q,
        best: r.best,
        got: r.hits
          .slice(0, 3)
          .map((h) => `${actOf(h.title)} ${norm(h.locator).slice(-30)}`),
      })),
    outScores: out.map((r) => ({
      id: r.question.id,
      best: Number(r.best.toFixed(3)),
    })),
  };

  if (flag("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(
    `Pytania: ${report.questions} (pominięte: ${report.skipped}), ze źródłem: ${report.answerable}, poza bazą: ${report.outOfCorpus}`,
  );
  console.log(
    `Akt we właściwym miejscu: top-1 ${report.top1}/${report.answerable} (${pct(report.top1, report.answerable)}), top-3 ${report.top3}/${report.answerable} (${pct(report.top3, report.answerable)})`,
  );
  console.log(
    `Przepis (ref) dla ${report.refChecked} pytań: top-1 ${report.ref1} (${pct(report.ref1, report.refChecked)}), top-3 ${report.ref3} (${pct(report.ref3, report.refChecked)})`,
  );
  console.log(
    "\nPróg | odpowiedź trafna | odpowiedź błędna | trafne źródło odrzucone | poza bazą odrzucone | poza bazą z odpowiedzią",
  );
  for (const row of report.thresholds) {
    console.log(
      `${row.threshold.toFixed(2)} | ${row.answeredCorrect} | ${row.answeredWrong} | ${row.wronglyRefused} | ${row.refusedCorrectly}/${report.outOfCorpus} | ${row.answeredOutOfCorpus}`,
    );
  }
  console.log(
    "\nNajwyższy wynik pytań spoza bazy:",
    report.outScores.map((s) => `${s.id}=${s.best}`).join(" "),
  );
  if (report.misses.length > 0) {
    console.log("\nChybione (poza top-3):");
    for (const miss of report.misses) {
      console.log(
        `- ${miss.id} (${miss.best.toFixed(3)}) ${miss.q}\n    dostałem: ${miss.got.join(" | ")}`,
      );
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
