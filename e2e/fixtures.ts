import { test as base, expect } from "@playwright/test";

const ROLES = ["supervisor", "employee", "hr", "director", "admin"];

// Every page starts with the onboarding already seen, so its dialog does not cover the page under test.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((roles) => {
      for (const role of roles) {
        window.localStorage.setItem(`onboardingDone:${role}`, "1");
      }
    }, ROLES);
    await use(page);
  },
});

export { expect };
