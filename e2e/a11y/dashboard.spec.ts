import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./axe";

test.describe("supervisor dashboard accessibility", () => {
  test("/pulpit has no serious axe violations offline", async ({ page }) => {
    await page.goto("/pulpit");
    await expect(
      page.getByRole("heading", { level: 1, name: /Dzień dobry/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Do zrobienia" }),
    ).toBeVisible();
    await expect(page.getByText(/Dane demonstracyjne/)).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("the start page of the supervisor is the dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/pulpit$/);
  });
});
