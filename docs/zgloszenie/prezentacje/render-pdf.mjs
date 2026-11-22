import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const decks = [
  { name: "asystent-kprm", maxSlides: 15 },
  { name: "kompas-mc", maxSlides: 10 },
];

const browser = await chromium.launch();
try {
  for (const { name, maxSlides } of decks) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(here, `${name}.html`)).href);
    const slides = await page.locator("section.slide").count();
    if (slides > maxSlides) {
      throw new Error(`${name}: ${slides} slides, the limit is ${maxSlides}`);
    }
    await page.pdf({
      path: join(here, `${name}.pdf`),
      preferCSSPageSize: true,
      printBackground: true,
    });
    console.log(`${name}.pdf: ${slides} slides`);
    await page.close();
  }
} finally {
  await browser.close();
}
