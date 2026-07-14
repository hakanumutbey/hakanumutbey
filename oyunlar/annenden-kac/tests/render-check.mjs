import { chromium } from "@playwright/test";

const cases = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const browser = await chromium.launch({ headless: true });

try {
  for (const item of cases) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      isMobile: Boolean(item.isMobile),
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    await page.locator('[data-device="keyboard"]').click();
    await page.locator("#startButton").click();
    await page.waitForTimeout(650);

    const result = await page.evaluate(() => {
      const canvas = document.querySelector("#game");
      const probe = document.createElement("canvas");
      const width = Math.min(160, canvas.width);
      const height = Math.min(90, canvas.height);
      probe.width = width;
      probe.height = height;
      const ctx = probe.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      let colored = 0;
      let bright = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r + g + b > 34) colored += 1;
        if (r + g + b > 260) bright += 1;
      }
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        coloredRatio: colored / (data.length / 4),
        brightRatio: bright / (data.length / 4),
        hud: document.querySelector("#keyLabel")?.textContent,
      };
    });

    if (result.canvasWidth < item.width || result.canvasHeight < item.height) {
      throw new Error(`${item.name}: canvas is undersized`);
    }
    if (result.coloredRatio < 0.6 || result.brightRatio < 0.03) {
      throw new Error(`${item.name}: canvas looks blank ${JSON.stringify(result)}`);
    }
    if (!result.hud?.startsWith("Anahtar: 0/")) {
      throw new Error(`${item.name}: HUD did not initialize`);
    }

    await page.screenshot({ path: `/tmp/annemden-kac-${item.name}.png`, fullPage: true });
    console.log(`${item.name}: ok`, result);
    await context.close();
  }
} finally {
  await browser.close();
}
