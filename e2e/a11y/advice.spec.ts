import { expect, test } from "../fixtures";
import { expectNoSeriousViolations } from "./axe";

test.describe("advice accessibility", () => {
  test("/porady has no serious axe violations, also with an article open", async ({
    page,
  }) => {
    await page.goto("/porady");
    await expect(
      page.getByRole("heading", { level: 1, name: "Porady" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Informacja zwrotna w trzech krokach",
      }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);

    await page
      .getByRole("button", {
        name: "Czytaj dalej: Informacja zwrotna w trzech krokach",
      })
      .click();
    await expect(
      page.getByRole("heading", { level: 3, name: "Zacznij od faktu" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
