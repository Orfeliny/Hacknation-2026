/// <reference lib="dom" />
// The e2e tsconfig has no DOM lib, but demoRole.ts touches `window`; this keeps the import compiling.
import { expect, test } from "@playwright/test";
import { DEMO_ROLE_STORAGE_KEY } from "../../src/lib/demoRole";
import { expectNoSeriousViolations } from "./axe";

test("employee result page has no serious axe violations offline", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => window.localStorage.setItem(key, "employee"),
    DEMO_ROLE_STORAGE_KEY,
  );
  await page.goto("/wynik-oceny?ocena=demo");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wynik oceny",
    }),
  ).toBeVisible();
  await expect(page.getByText("Tryb offline: ten widok wymaga")).toBeVisible();
  await expectNoSeriousViolations(page);
});
