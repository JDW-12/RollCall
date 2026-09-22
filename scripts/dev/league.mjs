// Usage: SHOTS_DIR=./shots [PLAYWRIGHT_CHROMIUM_PATH=...] node scripts/dev/league.mjs, against `next start -p 3200` on a fresh DB.
import { chromium } from "@playwright/test";
const base = "http://localhost:3200";
const out = process.env.SHOTS_DIR ?? "./shots";
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const london = (ms) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
};

await page.goto(base + "/start");
await page.fill('input[name="organiserName"]', "Josh");
await page.fill('input[name="name"]', "Crusaders Athletic");
await page.check('input[name="sport"][value="football"]');
await page.click('button:has-text("Create crew")');
await page.waitForURL(/welcome=1/);
const slug = page.url().match(/\/crew\/([^/?]+)/)[1];

// Empty league tab with the finders.
await page.goto(`${base}/crew/${slug}/league`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/league-empty.png`, fullPage: true });

// Link the division and paste the table.
await page.goto(`${base}/crew/${slug}/settings`, { waitUntil: "networkidle" });
const comp = page.locator("form[data-competition-form]").first();
await comp.locator('input[name="name"]').fill("Hackney Sunday, Division 3");
await comp.locator('input[name="externalUrl"]').fill("https://fulltime.thefa.com/displayTeam.html?teamID=42");
await comp.locator('input[name="teamName"]').fill("Crusaders Athletic");
await page.locator("section#league").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${out}/league-settings.png` });
await comp.locator('button:has-text("Add competition")').click();
const row = page.locator("details", { hasText: "Hackney Sunday" }).first();
await row.locator("summary").first().click();
await page.locator("form[data-standings-form]").first().locator("textarea[name=table]").fill(
  [
    "1\tHackney Wick FC\t12\t9\t2\t1\t34\t14\t20\t29",
    "2\tCrusaders Athletic\t12\t8\t2\t2\t31\t17\t14\t26",
    "3\tLondon Fields United\t12\t7\t1\t4\t26\t20\t6\t22",
    "4\tMarshes Rovers\t12\t4\t3\t5\t19\t22\t-3\t15",
    "5\tClapton Casuals\t12\t1\t2\t9\t11\t34\t-23\t5",
  ].join("\n"),
);
await page.locator("form[data-standings-form]").first().locator('button:has-text("Paste the table")').click();
await page.waitForTimeout(400);

// Two fixtures: one played, one to come.
async function fixture({ title, opponent, homeAway, hoursFromNow }) {
  await page.goto(`${base}/crew/${slug}/sessions/new`, { waitUntil: "networkidle" });
  await page.fill('input[name="title"]', title);
  await page.selectOption('select[name="competitionId"]', { index: 1 });
  await page.fill('input[name="opponent"]', opponent);
  await page.locator(`label:has(input[name="homeAway"][value="${homeAway}"])`).click();
  await page.fill('input[name="startsAt"]', london(Date.now() + hoursFromNow * 3600_000));
  await page.fill('input[name="capacity"]', "11");
  await page.fill('input[name="cost"]', "60");
  if (hoursFromNow < 0) await page.locator("form").first().scrollIntoViewIfNeeded();
  await page.click('button:has-text("Pin it")');
  await page.waitForURL(/pinned=1/);
  return page.url().split("?")[0];
}
const newForm = await fixture({ title: "Matchday 13", opponent: "Marshes Rovers", homeAway: "home", hoursFromNow: -4 });
await page.screenshot({ path: `${out}/fixture-form.png`, fullPage: false });
await page.goto(`${newForm}/play`, { waitUntil: "networkidle" });
await page.click('button:has-text("Confirm and go to ratings")');
await page.goto(newForm, { waitUntil: "networkidle" });
const result = page.locator("form[data-result-form]");
await result.locator('input[aria-label="Our score"]').fill("3");
await result.locator('input[aria-label="Their score"]').fill("1");
await result.locator('input[aria-label="Josh: goals"]').fill("2");
await result.locator('input[aria-label="Josh: assists"]').fill("1");
await result.locator('input[aria-label="Josh: manager rating out of ten"]').fill("9");
await page.locator("form[data-result-form]").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${out}/result-entry.png` });
await result.locator('button:has-text("Save the result")').click();
await page.waitForTimeout(500);
await page.locator("text=Matchday 13").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: `${out}/result-done.png`, fullPage: true });

await fixture({ title: "Matchday 14", opponent: "Hackney Wick FC", homeAway: "away", hoursFromNow: 72 });

await page.goto(`${base}/crew/${slug}/league`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/league-hub.png`, fullPage: true });
await browser.close();
