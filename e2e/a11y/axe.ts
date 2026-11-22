import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);
export const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

export async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.has(violation.impact ?? ""),
  );
  if (blocking.length === 0) return;
  throw new Error(
    [
      `axe found ${blocking.length} serious/critical violation(s):`,
      ...blocking.map(
        (violation) =>
          `- ${violation.id} (${violation.impact}): ${violation.help}\n    targets: ${violation.nodes
            .map((node) => node.target.map(String).join(" "))
            .join(", ")}`,
      ),
    ].join("\n"),
  );
}
