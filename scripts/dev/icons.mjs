import { chromium } from "@playwright/test";
import fs from "node:fs";
const svg = fs.readFileSync("public/icon.svg", "utf8");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true });
}
await browser.close();
