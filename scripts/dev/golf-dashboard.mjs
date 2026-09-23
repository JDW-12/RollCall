// Seeds a golf crew with three players and three rounds, then screenshots the golf pages in both themes.
// Usage: SHOTS_DIR=./shots [PLAYWRIGHT_CHROMIUM_PATH=...] [BASE=http://localhost:3300] node scripts/dev/golf-dashboard.mjs, against `next start` on a fresh DB.
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3300";
const out = process.env.SHOTS_DIR ?? "./shots";
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const mk = async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  return { ctx, page: await ctx.newPage() };
};
const PARS = "4 4 3 5 4 4 3 4 5 4 3 4 5 4 4 3 4 5";
const SI = "7 3 15 1 11 9 17 5 13 8 16 2 10 4 12 18 6 14";

function londonInput(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

const org = await mk();
const p = org.page;
await p.goto(base + "/start");
await p.fill('input[name="organiserName"]', "Josh Walker");
await p.fill('input[name="name"]', "Sunday Swingers");
await p.check('input[name="sport"][value="golf"]');
await p.click('button:has-text("Create crew")');
await p.waitForURL(/welcome=1/);
const crewUrl = p.url().split("?")[0];
await p.goto(crewUrl + "/settings");
const invite = (await p.locator("code", { hasText: "/join/" }).first().textContent()).trim();

// Two mates join.
const mates = [];
for (const name of ["Priya Shah", "Tom Reid"]) {
  const m = await mk();
  await m.page.goto(invite);
  await m.page.fill('input[name="name"]', name);
  await m.page.click('button:has-text("Join")');
  await m.page.waitForURL(new RegExp(crewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
  mates.push(m);
}

async function round(title, daysAgo, cards, first) {
  await p.goto(crewUrl + "/sessions/new");
  await p.fill('input[name="title"]', title);
  if (first) await p.fill('input[name="venueName"]', "Cottesmore Golf and Country");
  // Later rounds tap the recent-venue chip, which brings the Griffin card with it.
  else {
    await p.locator('[aria-label="Recent and suggested venues"] button', { hasText: "Cottesmore" }).click();
    await p.getByText("Card loads: Griffin").waitFor();
  }
  // Pinned in the future so the mates can say they're in (nobody can RSVP to a round that's been played),
  // then moved back to when it was actually played.
  await p.fill('input[name="startsAt"]', londonInput(Date.now() + 2 * 86400000));
  await p.fill('input[name="capacity"]', "4");
  await p.click('button:has-text("Pin it")');
  await p.waitForURL(/pinned=1/);
  const url = p.url().split("?")[0];
  for (const m of mates) {
    await m.page.goto(url);
    await m.page.locator('button:has-text("Count me in")').first().click();
    await m.page.getByText("You're in", { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => m.page.waitForTimeout(1200));
  }
  await p.goto(url + "/edit");
  await p.fill('input[name="startsAt"]', londonInput(Date.now() - daysAgo * 86400000));
  await p.click('button:has-text("Save changes")');
  await p.waitForURL((u) => !u.pathname.endsWith("/edit"));
  await p.goto(url);
  if (first) {
    await p.locator('input[aria-label="Course name"]').fill("Griffin");
    await p.locator('input[aria-label="Tee set"]').fill("Yellow");
    await p.locator('input[aria-label="Pars in hole order"]').fill(PARS);
    await p.locator('input[aria-label="Stroke indexes in hole order"]').fill(SI);
    await p.locator('button:has-text("Preview card")').click();
    await p.getByText("Typed card").waitFor();
    await p.click('button:has-text("Use this card")');
  }
  await p.getByRole("heading", { name: "Griffin" }).waitFor();
  const names = ["Your card", "Priya Shah's card", "Tom Reid's card"];
  for (let k = 0; k < cards.length; k++) {
    const c = p.locator("details", { hasText: names[k] }).first();
    if ((await c.getAttribute("open")) === null) await c.locator("summary").click();
    await c.locator('input[aria-label="Playing handicap"]').fill(String(cards[k].hcp));
    for (let i = 0; i < 18; i++) await c.locator(`input[aria-label="Hole ${i + 1} gross"]`).fill(String(cards[k].s[i]));
    await c.locator('input[aria-label="Longest drive in yards"]').fill(String(cards[k].drive));
    await c.locator('input[aria-label="Balls lost"]').fill(String(cards[k].lost));
    await c.getByRole("button", { name: "Save", exact: true }).click();
    await p.waitForTimeout(900);
  }
  return url;
}

const josh1 = [5, 4, 3, 6, 5, 4, 3, 5, 6, 4, 4, 5, 6, 5, 4, 3, 5, 6];
const priya1 = [4, 5, 3, 5, 4, 5, 3, 4, 5, 5, 3, 4, 6, 4, 4, 4, 4, 5];
const tom1 = [6, 5, 4, 6, 5, 5, 4, 5, 7, 5, 4, 5, 6, 6, 5, 4, 5, 6];
await round("Medal", 21, [{ hcp: 14, s: josh1, drive: 255, lost: 2 }, { hcp: 8, s: priya1, drive: 240, lost: 1 }, { hcp: 20, s: tom1, drive: 280, lost: 5 }], true);
await round("Fourball", 14, [{ hcp: 14, s: josh1.map((x, i) => (i % 5 === 0 ? x - 1 : x)), drive: 262, lost: 1 }, { hcp: 8, s: priya1.map((x, i) => (i % 4 === 0 ? x + 1 : x)), drive: 235, lost: 2 }, { hcp: 20, s: tom1, drive: 290, lost: 4 }]);
const josh3 = [4, 4, 2, 5, 5, 4, 3, 4, 7, 4, 3, 5, 4, 4, 6, 3, 4, 5];
const last = await round("Sunday medal", 2, [{ hcp: 13, s: josh3, drive: 271, lost: 1 }, { hcp: 8, s: priya1, drive: 244, lost: 0 }, { hcp: 20, s: tom1.map((x) => x - 1), drive: 300, lost: 3 }]);

// Submit Josh's card from the last round, which lands on the board.
const mine = p.locator("details", { hasText: "Your card" }).first();
if ((await mine.getAttribute("open")) === null) await mine.locator("summary").click();
await mine.getByRole("button", { name: "Submit round" }).click();
await p.waitForURL(/table\?round=/);

for (const theme of ["dark", "light"]) {
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await p.goto(p.url());
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/board-${theme}.png`, fullPage: true });
  await p.goto(crewUrl);
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/home-${theme}.png`, fullPage: true });
  await p.goto(last);
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/round-${theme}.png` });
}
// Wide screen home, dark.
await p.setViewportSize({ width: 1100, height: 900 });
await p.goto(crewUrl);
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/home-wide.png`, fullPage: true });
await browser.close();
console.log("done", crewUrl);
