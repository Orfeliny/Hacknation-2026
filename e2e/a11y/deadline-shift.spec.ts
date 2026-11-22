import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./axe";

test.describe("deadline shift accessibility", () => {
  test("list has no serious axe violations", async ({ page }) => {
    await page.goto("/przesuniecie-terminu");
    await expect(
      page.getByRole("heading", { level: 1, name: /przesunięcie terminu/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Joanna Mazur", { exact: false }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("open request with the decision form has no serious axe violations", async ({
    page,
  }) => {
    await page.goto("/przesuniecie-terminu");
    await page.getByRole("link", { name: /Joanna Mazur/ }).click();
    await expect(
      page.getByRole("button", { name: "Zapisz decyzję i przekaż do kadr" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("validation errors and the blocked request have no serious axe violations", async ({
    page,
  }) => {
    await page.goto("/przesuniecie-terminu");
    await page.getByRole("link", { name: /Michał Wójcik/ }).click();
    await expect(page.getByLabel("Uwzględniam wniosek")).toBeDisabled();
    await page
      .getByRole("button", { name: "Zapisz decyzję i przekaż do kadr" })
      .click();
    await expect(page.getByText("Wybierz rozstrzygnięcie.")).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
