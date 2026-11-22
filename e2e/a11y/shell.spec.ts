/// <reference lib="dom" />
// The e2e tsconfig has no DOM lib, but demoRole.ts touches `window`; this keeps the import compiling.
import { expect, test } from "@playwright/test";
import { DEMO_ROLES } from "../../src/lib/demoRole";
import { expectNoSeriousViolations } from "./axe";

const ROLE_TABS_NAME = "Rola (widok demonstracyjny)";

test.describe("app shell accessibility", () => {
  for (const role of DEMO_ROLES) {
    test(`home page has no serious axe violations for role ${role.value}`, async ({
      page,
    }) => {
      await page.goto("/");
      const tabs = page.getByRole("navigation", { name: ROLE_TABS_NAME });
      const tab = tabs.getByRole("link", { name: role.tabLabel, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }

  test("the axe helper fails on a critical violation", async ({ page }) => {
    await page.setContent(
      '<!doctype html><html lang="pl"><head><title>x</title></head><body><main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>',
    );
    await expect(expectNoSeriousViolations(page)).rejects.toThrow("image-alt");
  });
});
