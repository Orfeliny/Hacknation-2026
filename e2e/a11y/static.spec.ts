import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./axe";

const PAGES = [
  { path: "/zasady", heading: "Zasady i paleta" },
  { path: "/deklaracja-dostepnosci", heading: /Deklaracja dostępności/ },
];

test.describe("static pages accessibility", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} has no serious axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }

  test("footer links resolve to the static pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: "Zasady i paleta" }).click();
    await expect(page).toHaveURL(/\/zasady$/);
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Deklaracja dostępności" })
      .click();
    await expect(page).toHaveURL(/\/deklaracja-dostepnosci$/);
  });
});
