import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { actOf, judge } from "./knowledge-eval.mjs";

type Question = {
  id: string;
  kind: "answer" | "two" | "conflict" | "out";
  q: string;
  acts?: string[];
  ref?: string;
  needsOfficeDoc?: boolean;
};

const set = JSON.parse(
  readFileSync(
    new URL("./knowledge-eval-questions.json", import.meta.url),
    "utf8",
  ),
) as { questions: Question[] };
const questions = set.questions;

describe("knowledge evaluation question set", () => {
  it("has unique ids and non-empty questions", () => {
    const ids = questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of questions) expect(question.q.trim()).not.toBe("");
  });

  it("covers off-topic questions, source conflicts and two-article questions", () => {
    const count = (kind: Question["kind"]) =>
      questions.filter((question) => question.kind === kind).length;
    expect(count("out")).toBeGreaterThanOrEqual(5);
    expect(count("conflict")).toBeGreaterThanOrEqual(3);
    expect(count("two")).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeGreaterThanOrEqual(30);
  });

  it("names the expected acts for every question that has a source", () => {
    for (const question of questions.filter((item) => item.kind !== "out")) {
      expect(question.acts?.length, question.id).toBeGreaterThan(0);
      for (const act of question.acts ?? []) {
        expect(act, question.id).toMatch(/^(\d{4}\/\d+|gov:[a-z-]+)$/);
      }
    }
    for (const question of questions.filter((item) => item.kind === "out")) {
      expect(question.acts, question.id).toBeUndefined();
    }
  });

  it("only marks conflict questions as needing an office document", () => {
    for (const question of questions) {
      expect(Boolean(question.needsOfficeDoc), question.id).toBe(
        question.kind === "conflict",
      );
    }
  });
});

describe("evaluation helpers", () => {
  it("turns a title into an act id", () => {
    expect(actOf("Dz.U. 2008 poz. 1505")).toBe("2008/1505");
    expect(actOf("gov.pl: Ocena okresowa")).toBe("gov:ocena-okresowa");
    expect(actOf("gov.pl: Oceny pracownicze")).toBe("gov:oceny-pracownicze");
  });

  it("judges the rank of the expected act and article", () => {
    const hits = [
      { title: "Dz.U. 1974 poz. 141", locator: "Art. 112.", score: 0.46 },
      { title: "Dz.U. 2008 poz. 1505", locator: "Art. 83.", score: 0.45 },
    ];
    const question: Question = {
      id: "q",
      kind: "answer",
      q: "x",
      acts: ["2008/1505"],
      ref: "Art. 83",
    };
    expect(judge(question, hits)).toEqual({
      top1: false,
      top3: true,
      ref1: false,
      ref3: true,
      best: 0.46,
    });
  });

  it("reports no hit as a miss with a zero score", () => {
    const question: Question = {
      id: "q",
      kind: "answer",
      q: "x",
      acts: ["2008/1505"],
    };
    expect(judge(question, [])).toMatchObject({
      top1: false,
      top3: false,
      best: 0,
    });
  });
});
