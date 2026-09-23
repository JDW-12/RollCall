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
  test.setTimeout(150_000); // one long journey on purpose: it mirrors a real round end to end
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
  // The picker folds away once a course is set, and the round is headed by the course, not the format.
  await expect(org.getByRole("heading", { name: course })).toBeVisible();
  await expect(org.getByText("White tees · Stableford")).toBeVisible();

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
  await expect(yourCard.locator("li", { hasText: "SI 9" })).toContainText("Birdie");
  await yourCard.locator('input[aria-label="Longest drive in yards"]').fill("250");
  await yourCard.locator('input[aria-label="Balls lost"]').fill("2");
  await yourCard.getByRole("button", { name: "Save", exact: true }).click();
  // The card folds away once saved; the leaderboard above it shows the result and the round highlights.
  const table = org.locator("table", { hasText: "Player" });
  await expect(table.locator("tbody tr").first()).toContainText("Josh Test");
  await expect(table.locator("tbody tr").first()).toContainText("3 holes");
  await expect(table.locator("tbody tr").first().locator("td").last()).toHaveText("9");
  await expect(table.locator("tbody tr").first().locator("td").nth(4)).toHaveText("1"); // one birdie
  const highlights = org.locator('ul[aria-label="Round highlights"]');
  await expect(highlights).toContainText("Birdie");
  await expect(highlights).toContainText("250 yds");
  await expect(highlights).toContainText("Balls donated");

  // The player page turns the round into golf stats and a golf-flavoured card.
  const sessionUrl = org.url().split("?")[0];
  const crewUrl = sessionUrl.replace(/\/s\/.*$/, "");
  const playerLink = await org.locator('a[href*="/players/"]').first().getAttribute("href", { timeout: 3000 }).catch(() => null);
  if (playerLink) {
    await org.goto(playerLink);
    await expect(org.getByText("Longest drive")).toBeVisible();
    await expect(org.locator("text=HCP")).toBeVisible();
    // Golf is rated on the card, never on turning up.
    await expect(org.getByText("Sick note")).toHaveCount(0);
    await expect(org.getByText("Turns up")).toHaveCount(0);
    await org.goto(sessionUrl);
  }

  // Submitting the round saves it and lands on the leaderboard, showing what it earned.
  const submitCard = org.locator("details", { hasText: "Your card" });
  await submitCard.locator("summary").click();
  await submitCard.getByRole("button", { name: "Submit round" }).click();
  await expect(org).toHaveURL(/\/table\?round=/);
  await expect(org.getByText("Round submitted")).toBeVisible();
  await expect(org.getByText("You scored")).toBeVisible();
  await expect(org.getByText("9 Stableford (3 of 9 holes) + 0 from votes")).toBeVisible();
  // Golf's board has no attendance columns or penalties.
  await expect(org.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  await expect(org.getByText("Nothing for turning up.", { exact: false })).toBeVisible();
  await expect(org.locator("th", { hasText: "Turns up" })).toHaveCount(0);

  // The home dashboard carries your card and your latest round.
  await org.goto(crewUrl);
  await expect(org.getByRole("heading", { name: "Your card" })).toBeVisible();
  const yours = org.getByRole("region", { name: "Your card" });
  await expect(yours).toContainText("Latest round");
  await expect(yours).toContainText(course);
  await expect(yours).toContainText("Stableford");
  await expect(org.getByRole("region", { name: "The crew" })).toContainText(`9 pts at ${course}`);
  // The golf feed is only rounds scheduled and rounds posted: no RSVP or join chatter.
  const feed = org.getByRole("region", { name: "Feed" });
  await expect(feed).toContainText(`posted`);
  await expect(feed).toContainText(`at ${course} (thru 3)`);
  await expect(feed).toContainText("9 pts");
  await expect(feed).toContainText("scheduled");
  await expect(feed).not.toContainText("is in.");
  await expect(feed).not.toContainText("joined");
  // Opening the site's front door when already signed in goes to the dashboard, which carries the
  // crew as a card; the crew header's sport icon leads back there too.
  await org.goto("/");
  await expect(org).toHaveURL(/\/home$/);
  await expect(org.getByRole("heading", { name: "Your stats" })).toBeVisible();
  await org.getByRole("region", { name: "Your crews" }).getByRole("link").first().click();
  await expect(org).toHaveURL(crewUrl);
  await org.getByRole("link", { name: "Your dashboard" }).click();
  await expect(org).toHaveURL(/\/home$/);

  // Play mode: opens on the first hole without a score, and saving a hole moves on and lands on the card.
  await org.goto(sessionUrl);
  await org.getByRole("link", { name: /Play live/ }).click();
  await expect(org).toHaveURL(/\/live$/);
  await expect(org.getByText("Hole 2", { exact: true })).toBeVisible();
  await expect(org.getByText("Satellite map isn't switched on yet", { exact: false })).toBeVisible();
  await org.getByRole("button", { name: "Par 4, next" }).click();
  await expect(org.getByText("Hole 3", { exact: true })).toBeVisible();
  await expect(org.getByLabel("Strokes on hole 3")).toHaveText("2");
  await org.getByRole("link", { name: "← Card" }).click();
  await expect(org.getByText("· 4 holes")).toBeVisible();

  // A later round: the venue finder on the session form searches the course library, and picking the
  // course there loads the card onto the session with no picker step.
  await org.goto(crewUrl);
  await org.click('a:has-text("Pin a session")');
  await org.check('input[name="sport"][value="golf"]');
  await org.fill('input[name="title"]', "Sunday medal");
  await org.fill('input[name="startsAt"]', londonInput(Date.now() + 5 * 60 * 60_000));
  // Tapping a recent venue brings the card it was last played on: no second search for the club.
  await org.locator('[aria-label="Recent and suggested venues"] button', { hasText: "E2E Links" }).click();
  await expect(org.getByText(`Card loads: ${course} · White tees`)).toBeVisible();
  await org.fill('input[name="venueName"]', "");
  await org.locator('input[name="venueName"]').pressSequentially(`Links ${stamp}`, { delay: 30 });
  const option = org.locator('[role="option"]', { hasText: course });
  await expect(option).toBeVisible();
  await expect(option).toContainText("par 36");
  await option.click();
  await expect(org.getByText("Card loads:")).toBeVisible();
  await org.fill('input[name="capacity"]', "4");
  await org.click('button:has-text("Pin it")');
  await expect(org).toHaveURL(/\/s\/[a-z0-9]+\?pinned=1/);
  await expect(org.getByRole("heading", { name: course })).toBeVisible();
  await expect(org.getByText("9 holes · par 36").first()).toBeVisible();

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

  // Typing the same course and tee again corrects the library row rather than adding a second one.
  const change = org.locator("details", { hasText: "Change course" });
  await change.locator("summary").click();
  await change.locator('input[aria-label="Course name"]').fill(course.toUpperCase());
  await change.locator('input[aria-label="Tee set"]').fill("white");
  await change.locator('input[aria-label="Pars in hole order"]').fill("4 4 3 5 4 4 3 4 5");
  await change.locator('input[aria-label="Stroke indexes in hole order"]').fill("5 3 9 1 7 4 8 6 2");
  await change.locator('button:has-text("Preview card")').click();
  await change.locator('button:has-text("Use this card")').click();
  await expect(org.getByText("9 holes · par 36").first()).toBeVisible();
  const again = (await (await ctx.request.get(`/api/courses/search?q=${encodeURIComponent(`Links ${stamp}`)}`)).json()) as { hits: { name: string; uses: number; holes: { par: number }[] }[] };
  const mine = again.hits.filter((h) => h.name.toLowerCase() === course.toLowerCase());
  expect(mine).toHaveLength(1);
  expect(mine[0].uses).toBe(3);
  expect(mine[0].holes[0].par).toBe(4);

  // The crew can choose its own things to vote on; the rate page and cards follow.
  await org.goto(`${crewUrl}/settings`);
  const votes = org.locator("form[data-ratings-form]");
  await votes.locator('input[aria-label="Vote 2 label"]').fill("Best putter");
  await votes.locator('input[aria-label="Vote 2 card stat"]').fill("PUT");
  await votes.locator('input[aria-label="Vote 4 label"]').fill("Best dressed");
  await votes.locator('button:has-text("Save votes")').click();
  await expect(org.getByText("Saved. 4 things to vote on")).toBeVisible();
  await expect(org.getByText("Custom")).toBeVisible();

  // Lookups need a signed-in member: no cookie, no data (and no free proxy to the providers).
  expect((await request.get("/api/places?q=richmond")).status()).toBe(401);
  expect((await request.get("/api/courses/search?q=richmond")).status()).toBe(401);
});
