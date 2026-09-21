import { chromium } from "@playwright/test";
const out = "/tmp/claude-0/-home-user-Remoovals/9aaf5bb5-a8d7-505a-9eb5-464ae059be3c/scratchpad/shots";
const base = "http://localhost:3200";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: "rc_session", value: "demo-organiser-session-AZRX0dsdxfeOLPNqEF9FOToD", domain: "localhost", path: "/" }, { name: "rc_theme", value: "light", domain: "localhost", path: "/" }]);
const p = await ctx.newPage();
for (const [n, u] of [["light-home", "/crew/tuesday-fc"], ["light-table", "/crew/tuesday-fc/table"], ["light-money", "/crew/tuesday-fc/money"], ["light-new", "/crew/tuesday-fc/sessions/new"]]) {
  await p.goto(base + u, { waitUntil: "networkidle" });
  await p.screenshot({ path: out + "/" + n + ".png", clip: { x: 0, y: 0, width: 420, height: 900 } });
}
await p.goto(base + "/crew/tuesday-fc/table", { waitUntil: "networkidle" });
const href = await p.locator("tbody tr a").first().getAttribute("href");
await p.goto(base + href, { waitUntil: "networkidle" });
await p.screenshot({ path: out + "/light-player.png", clip: { x: 0, y: 0, width: 420, height: 900 } });
const d = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await d.addCookies([{ name: "rc_theme", value: "light", domain: "localhost", path: "/" }]);
const dp = await d.newPage();
await dp.goto(base + "/", { waitUntil: "networkidle" });
await dp.screenshot({ path: out + "/light-landing.png" });
await browser.close(); console.log("ok");
