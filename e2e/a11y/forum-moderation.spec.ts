/// <reference lib="dom" />
// The e2e tsconfig has no DOM lib, but demoRole.ts touches `window`; this keeps the import compiling.
import { DEMO_ROLE_STORAGE_KEY } from "../../src/lib/demoRole";
import { expect, test } from "../fixtures";
import { expectNoSeriousViolations } from "./axe";

test.describe("forum moderation accessibility", () => {
  test("/forum/moderacja has no serious axe violations, also after hiding a thread", async ({
    page,
  }) => {
    await page.addInitScript(
      (key) => window.localStorage.setItem(key, "hr"),
      DEMO_ROLE_STORAGE_KEY,
    );
    await page.goto("/forum/moderacja");
    await expect(
      page.getByRole("heading", { level: 1, name: "Moderacja forum" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Ukryj: Świetna oferta, kliknij tutaj",
      }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);

    await page
      .getByRole("button", { name: "Ukryj: Świetna oferta, kliknij tutaj" })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Przywróć: Świetna oferta, kliknij tutaj",
      }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
