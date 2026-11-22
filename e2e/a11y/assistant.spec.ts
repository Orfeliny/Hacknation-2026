import { expect, test } from "../fixtures";
import { expectNoSeriousViolations } from "./axe";

test.describe("assistant accessibility", () => {
  test("/kompas has no serious axe violations, also with an answer and a source open", async ({
    page,
  }) => {
    await page.goto("/kompas");
    await expect(
      page.getByRole("heading", { level: 1, name: "Kompas: asystent wiedzy" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);

    await page
      .getByLabel("Pytanie do asystenta")
      .fill("Jak często dokonuje się oceny okresowej?");
    await page.getByRole("button", { name: "Zapytaj asystenta" }).click();
    await expect(
      page.getByRole("heading", { name: "Dokumenty urzędu" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);

    await page
      .getByRole("button", { name: /Ustawa o służbie cywilnej/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "Źródło odpowiedzi" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
