import { expect, test } from "@playwright/test";

test("shell renders in offline mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Rola (widok demonstracyjny)" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText("Tryb offline");
});

test("notes is dev-only: no menu link and not found in the e2e build", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Notatki" })).toHaveCount(0);
  await page.goto("/notes");
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono strony" }),
  ).toBeVisible();
});

test("unknown route offers a way back to a registered page", async ({
  page,
}) => {
  await page.goto("/no-such-page");
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono strony" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Wróć na stronę główną" }).click();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono strony" }),
  ).toHaveCount(0);
});
