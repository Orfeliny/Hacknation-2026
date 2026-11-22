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

test("notes navigation with offline validation", async ({ page }) => {
  await page.goto("/");
  await page.goto("/notes");
  await expect(page).toHaveURL("/notes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Notatki" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dodaj notatkę" }),
  ).toBeDisabled();
  const input = page.getByLabel("Nowa notatka");
  await input.fill("x");
  await input.fill("");
  await expect(page.getByRole("alert")).toContainText("Wpisz treść notatki.");
  await page.goBack();
  await expect(page.getByRole("main")).toBeVisible();
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
