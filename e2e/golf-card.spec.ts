import { test, expect, type Page } from "@playwright/test";

/**
 * Golf: the organiser types a card off the paper scorecard, it becomes the session's Stableford
 * card and lands in the shared course library, a later session finds it by search, and a
 * correction to the pars updates the library copy.
 */

function londonInput(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

async function pinRound(page: Page, title: string) {
  await page.click('a:has-text("Pin a session")');
  await page.check('input[name="sport"][value="golf"]');
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="startsAt"]', londonInput(Date.now() + 4 * 60 * 60_000));
  await page.fill('input[name="venueName"]', "E2E Links");
  await page.fill('input[name="capacity"]', "4");
  await page.click('button:has-text("Pin it")');
  await expect(page).toHaveURL(/\/s\/[a-z0-9]+\?pinned=1/);
  // The organiser is counted in when they pin, so they already have a card to fill.
  await expect(page.getByText("1/4")).toBeVisible();
}

test("golf: typed card → library → reuse → correction", async ({ browser, request }) => {
  const stamp = Date.now().toString(36);
  const ctx = await browser.newContext();
  const org = await ctx.newPage();

  await org.goto("/start");
  await org.fill('input[name="organiserName"]', "Josh Test");
  await org.fill('input[name="name"]', `E2E Golf ${stamp}`);
  await org.check('input[name="sport"][value="golf"]');
  await org.click('button:has-text("Create crew")');
  await expect(org).toHaveURL(/\/crew\/e2e-golf-.*welcome=1/);

  await pinRound(org, "Saturday fourball");
  await expect(org.getByText("Using a standard par-72 layout")).toBeVisible();

  // Type a nine-hole card off the paper scorecard, preview it, use it and save it to the library.
  const course = `E2E Links ${stamp}`;
  const picker = org.locator("details", { hasText: "Pick the course" });
  await picker.locator('input[aria-label="Course name"]').fill(course);
  await picker.locator('input[aria-label="Tee set"]').fill("White");
  await picker.locator('input[aria-label="Pars in hole order"]').fill("4 4 3 5 4 4 3 4 5");
  await picker.locator('input[aria-label="Stroke indexes in hole order"]').fill("5 3 9 1 7 4 8 6 2");
  await picker.locator('button:has-text("Preview card")').click();
  await expect(org.getByText("Typed card")).toBeVisible();
  await expect(org.getByText("9 holes · par 36").first()).toBeVisible();
  await org.click('button:has-text("Use this card")');
  // The picker folds away once a course is set; the card line above the table says which.
  const cardLine = org.locator("p", { hasText: "Card:" });
  await expect(cardLine).toContainText(`${course} · White tees`);
  await expect(cardLine).toContainText("from the course library");

  // The player's card now has nine holes with the typed pars.
  const yourCard = org.locator("details", { hasText: "Your card" });
  await expect(yourCard.locator('input[aria-label="Hole 9 gross"]')).toBeVisible();
  await expect(yourCard.locator('input[aria-label="Hole 10 gross"]')).toHaveCount(0);
  await expect(yourCard.locator("li", { hasText: "SI 1" })).toContainText("Par 5");

  // Score with the stepper: first tap lands on par, off 9 the SI-1 hole gets a shot, points update live.
  await yourCard.locator('input[aria-label="Playing handicap"]').fill("9");
  await yourCard.locator('button[aria-label="Hole 1: one more"]').click(); // par 4, a shot on every hole off 9 over nine → 3 pts
  await yourCard.locator('button[aria-label="Hole 4: one more"]').click(); // par 5 → 5
  await yourCard.locator('button[aria-label="Hole 4: one more"]').click(); // 6 gross, net 5 → 2 pts
  await yourCard.locator('button[aria-label="Hole 3: one fewer"]').click(); // par 3 → 2 gross, birdie → 4 pts
  await expect(yourCard.locator('[aria-label="Hole 1: 3 points"]')).toBeVisible();
  await expect(yourCard.locator('[aria-label="Hole 4: 2 points"]')).toBeVisible();
  await expect(yourCard.locator('[aria-label="Hole 3: 4 points"]')).toBeVisible();
  await yourCard.locator('button:has-text("Save card")').click();
  // The card folds away once saved; the leaderboard above it shows the result.
  const table = org.locator("table", { hasText: "Player" });
  await expect(table.locator("tbody tr").first()).toContainText("Josh Test");
  await expect(table.locator("tbody tr").first()).toContainText("3 holes");
  await expect(table.locator("tbody tr").first().locator("td").last()).toHaveText("9");

  // A later round finds the card in the library by search and reuses it in one tap.
  await org.goto(org.url().replace(/\/s\/.*$/, ""));
  await pinRound(org, "Sunday medal");
  const picker2 = org.locator("details", { hasText: "Pick the course" });
  await picker2.locator('input[aria-label="Search golf courses"]').fill(`Links ${stamp}`);
  const hit = org.locator('ul[aria-label="Matching courses"] li', { hasText: course });
  await expect(hit).toBeVisible();
  await expect(hit.getByText("used 1×")).toBeVisible();
  await hit.locator('button:has-text("Use")').click();
  await expect(org.locator("p", { hasText: "Card:" })).toContainText(`${course} · White tees`);

  // Organiser corrects hole 1 to a par 5: the session card and the library copy both change.
  const fix = org.locator("details", { hasText: "Fix pars and stroke indexes" });
  await expect(fix.getByText("Updates the library")).toBeVisible();
  await fix.locator("summary").click();
  await fix.locator('input[aria-label="Hole 1 par"]').fill("5");
  await fix.locator('button:has-text("Save course")').click();
  await expect(org.getByText("9 holes · par 37").first()).toBeVisible();
  const res = await ctx.request.get(`/api/courses/search?q=${encodeURIComponent(`Links ${stamp}`)}`);
  const body = (await res.json()) as { hits: { name: string; holes: { par: number }[]; uses: number }[] };
  const row = body.hits.find((h) => h.name === course)!;
  expect(row.holes[0].par).toBe(5);
  expect(row.uses).toBe(2);

  // Lookups need a signed-in member: no cookie, no data (and no free proxy to the providers).
  expect((await request.get("/api/places?q=richmond")).status()).toBe(401);
  expect((await request.get("/api/courses/search?q=richmond")).status()).toBe(401);
});
