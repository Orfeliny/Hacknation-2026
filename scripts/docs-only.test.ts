import { describe, expect, it } from "vitest";
import { isDocsOnly } from "./docs-only.mjs";

describe("isDocsOnly", () => {
  it("is true for docs, specs and markdown only", () => {
    expect(
      isDocsOnly(["docs/testing.md", "specs/x.md", "README.md", "docs/a.png"]),
    ).toBe(true);
  });

  it("is false when any source file changes", () => {
    expect(isDocsOnly(["docs/testing.md", "src/app/App.tsx"])).toBe(false);
  });

  it("is false for an empty diff", () => {
    expect(isDocsOnly([])).toBe(false);
  });

  it("is false for markdown under .github", () => {
    expect(isDocsOnly([".github/pull_request_template.md"])).toBe(false);
  });

  it("is false for config that merely looks like docs", () => {
    expect(isDocsOnly(["docs/../package.json"])).toBe(false);
    expect(isDocsOnly(["package.json"])).toBe(false);
  });
});
