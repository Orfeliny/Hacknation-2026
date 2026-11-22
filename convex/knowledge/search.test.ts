import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { limitPerDocument, type KnowledgeHit } from "./search";

function hit(doc: string, n: number, score: number): KnowledgeHit {
  return {
    chunkId: `c${doc}${n}` as Id<"knowledgeChunks">,
    documentId: doc as Id<"knowledgeDocuments">,
    scope: "national",
    kind: "law",
    title: doc,
    locator: `Art. ${n}.`,
    text: "x",
    score,
  };
}

describe("limitPerDocument", () => {
  it("keeps the ranking but lets one document take at most 3 places", () => {
    const ranked = [
      hit("a", 1, 0.9),
      hit("a", 2, 0.8),
      hit("a", 3, 0.7),
      hit("a", 4, 0.6),
      hit("b", 1, 0.5),
    ];
    expect(limitPerDocument(ranked).map((h) => h.locator + h.title)).toEqual([
      "Art. 1.a",
      "Art. 2.a",
      "Art. 3.a",
      "Art. 1.b",
    ]);
  });
});
