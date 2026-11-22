import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./axe";

test.describe("observations journal accessibility", () => {
  test("/obserwacje renders its offline state with no serious axe violations", async ({
    page,
  }) => {
    await page.goto("/obserwacje");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dziennik obserwacji" }),
    ).toBeVisible();
    await expect(page.getByText(/wymaga połączenia z backendem/)).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
