import { chromium } from "@playwright/test";
import fs from "node:fs";
const base = "http://localhost:3200";
const out = "/tmp/claude-0/-home-user-Remoovals/9aaf5bb5-a8d7-505a-9eb5-464ae059be3c/scratchpad/shots";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: "rc_session", value: "demo-organiser-session-f47FPzhydQ44vHzL0iYAezYm", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const shots = [
  ["landing", "/", false],
  ["crew-home", "/crew/tuesday-fc", true],
  ["session", "/crew/tuesday-fc/sessions", false],
  ["table", "/crew/tuesday-fc/table", true],
  ["money", "/crew/tuesday-fc/money", false],
  ["settings", "/crew/tuesday-fc/settings", false],
  ["padel", "/crew/battersea-padel", false],
];
for (const [name, path, full] of shots) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
}
// Session detail: next session
await page.goto(base + "/crew/tuesday-fc", { waitUntil: "networkidle" });
const href = await page.locator('a[href*="/s/"]').first().getAttribute("href");
await page.goto(base + href, { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/session-detail.png`, fullPage: true });
// A played session with awards
await page.goto(base + "/crew/tuesday-fc/sessions", { waitUntil: "networkidle" });
const played = await page.locator('a[href*="/s/"]:has-text("Played")').first().getAttribute("href");
await page.goto(base + played, { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/session-played.png`, fullPage: true });
await page.goto(base + played + "/rate", { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/rate.png`, fullPage: true });
// Player card
await page.goto(base + "/crew/tuesday-fc/table", { waitUntil: "networkidle" });
const p = await page.locator("tbody tr a").first().getAttribute("href");
await page.goto(base + p, { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/player.png`, fullPage: true });
// OG images
const anon = await browser.newContext();
const r1 = await anon.request.get(base + played + "/opengraph-image");
fs.writeFileSync(`${out}/og-session.png`, await r1.body());
const r2 = await anon.request.get(base + p + "/opengraph-image");
fs.writeFileSync(`${out}/og-player.png`, await r2.body());
// Desktop landing
const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const d = await desk.newPage();
await d.goto(base + "/", { waitUntil: "networkidle" });
await d.screenshot({ path: `${out}/landing-desktop.png` });
await browser.close();
console.log("done");
