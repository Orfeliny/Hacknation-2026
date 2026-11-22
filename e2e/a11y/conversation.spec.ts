import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./axe";

test.describe("conversation accessibility", () => {
  test("/rozmowy has no serious axe violations offline", async ({ page }) => {
    await page.goto("/rozmowy");
    await expect(
      page.getByRole("heading", { level: 1, name: "Rozmowy z pracownikiem" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Tryb offline: przygotowanie rozmów" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("/rozmowy with a person and kind in the URL still renders offline", async ({
    page,
  }) => {
    await page.goto("/rozmowy?pracownik=demo&rodzaj=opening");
    await expect(
      page.getByRole("heading", { level: 1, name: "Rozmowy z pracownikiem" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
