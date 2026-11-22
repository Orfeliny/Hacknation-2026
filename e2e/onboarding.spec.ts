/// <reference lib="dom" />
import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations } from "./a11y/axe";

const ROLE_TABS_NAME = "Rola (widok demonstracyjny)";

test.describe("onboarding", () => {
  test("opens on the first visit, walks through the steps and does not return", async ({
    page,
  }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Witaj w Azymucie" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Krok 1 z/)).toBeVisible();
    await expectNoSeriousViolations(page);

    await dialog.getByRole("button", { name: "Dalej" }).click();
    await expect(page.getByRole("dialog", { name: "Oceny" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("shows the onboarding of a role the first time it is picked, and restarts on reset", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Pomiń" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page
      .getByRole("navigation", { name: ROLE_TABS_NAME })
      .getByRole("link", { name: "Pracownik", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Witaj w Azymucie" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pomiń" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const reset = page.getByRole("button", { name: "Resetuj onboarding" });
    await reset.click();
    await expect(
      page.getByRole("dialog", { name: "Witaj w Azymucie" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(reset).toBeFocused();
  });

  test("the guide page lists the steps without a dialog", async ({ page }) => {
    await page.addInitScript(() => {
      for (const role of ["supervisor"]) {
        window.localStorage.setItem(`onboardingDone:${role}`, "1");
      }
    });
    await page.goto("/przewodnik");
    await expect(
      page.getByRole("heading", { level: 1, name: "Przewodnik po aplikacji" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectNoSeriousViolations(page);
  });
});
