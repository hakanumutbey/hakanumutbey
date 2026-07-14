import { chromium } from "playwright";
import { withServer } from "./testServer.mjs";

export async function withBrowserGame(port, fn) {
  const baseUrl = `http://127.0.0.1:${port}`;
  return withServer(port, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      return await fn({
        browser,
        baseUrl,
        openPage: (readyPredicate) => openGamePage(browser, baseUrl, readyPredicate)
      });
    } finally {
      await browser.close();
    }
  });
}

async function openGamePage(browser, baseUrl, readyPredicate) {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (readyPredicate) await page.waitForFunction(readyPredicate);
  return page;
}
