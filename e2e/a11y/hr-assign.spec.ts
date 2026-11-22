import { expect, test } from "../fixtures";
import { expectNoSeriousViolations } from "./axe";

test("hr-assign has no serious axe violations offline", async ({ page }) => {
  await page.goto("/kadry/przypisanie");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Przypisz nowego oceniającego",
    }),
  ).toBeVisible();
  await expectNoSeriousViolations(page);
});
