// @vitest-environment node
import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./convert";

describe("htmlToMarkdown on an ELI act", () => {
  const html = `<h1><span class="head-type">Ustawa</span><span class="head-date">z dnia 21 listopada 2008&nbsp;r.</span><span class="head-title">o służbie cywilnej <a class="gloss-link tooltip" href="#gloss-0:1:"><sup>1)</sup><span class="tooltip-text">Niniejszą ustawą zmienia się ustawy.</span></a></span></h1>
<h2>Art. 81.</h2><p>Ocena okresowa jest sporządzana co najmniej raz na 2 lata<a class="gloss-link" href="#gloss-0:2:"><sup>2)</sup></a>.</p>`;
  const markdown = htmlToMarkdown(html).replace(/\s/g, " ");

  it("keeps the act heading as separate words without its footnote", () => {
    expect(markdown).toContain(
      "# Ustawa z dnia 21 listopada 2008 r. o służbie cywilnej",
    );
    expect(markdown).not.toContain("Niniejszą ustawą");
    expect(markdown).not.toContain("gloss");
  });

  it("drops footnote markers from the body", () => {
    expect(markdown).toContain("co najmniej raz na 2 lata.");
  });
});
