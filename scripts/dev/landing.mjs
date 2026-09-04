import { chromium } from "@playwright/test";
const out = "/tmp/claude-0/-home-user-Remoovals/9aaf5bb5-a8d7-505a-9eb5-464ae059be3c/scratchpad/shots";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, w, h] of [["landing-desktop", 1280, 1400], ["landing-mobile", 420, 1800]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:3200/", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
