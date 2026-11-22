import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./axe";

test("/logowanie has no serious axe violations", async ({ page }) => {
  await page.goto("/logowanie");
  await expect(
    page.getByRole("heading", { level: 1, name: "Zaloguj się" }),
  ).toBeVisible();
  await expectNoSeriousViolations(page);
});
