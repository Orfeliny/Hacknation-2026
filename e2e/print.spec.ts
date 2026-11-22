import { expect, test } from "./fixtures";

const ROUTES = ["/druk", "/zasady"];

test.describe("print emulation", () => {
  for (const route of ROUTES) {
    test(`${route} prints only main`, async ({ page }) => {
      await page.goto(route);
      await page.emulateMedia({ media: "print" });
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("banner")).toBeHidden();
      await expect(page.getByRole("navigation")).toHaveCount(0);
      await expect(page.getByRole("contentinfo")).toBeHidden();
      await expect(page.getByRole("status")).toHaveCount(0);

      const viewport = page.viewportSize();
      const box = await page.getByRole("main").boundingBox();
      expect(box).not.toBeNull();
      expect(box?.x ?? 99).toBeLessThanOrEqual(1);
      expect((box?.width ?? 0) + 1).toBeGreaterThanOrEqual(
        (viewport?.width ?? 0) - 20,
      );
    });
  }

  test("the onboarding dialog does not print", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto("/druk");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("main")).toBeVisible();
  });
});
