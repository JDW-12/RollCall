import { test, expect, type Page } from "@playwright/test";

/**
 * The whole loop, as two people: an organiser starts a crew and pins a session,
 * a mate joins from the invite link with just a name, both tap in, the organiser
 * confirms who played, both rate, and the table, money and share card all update.
 */

async function readInvite(page: Page): Promise<string> {
  const code = page.locator("code", { hasText: "/join/" }).first();
  await expect(code).toBeVisible();
  return (await code.textContent())!.trim();
}

test("organiser + mate: crew → session → RSVP → play → rate → table → money", async ({ browser }) => {
  const stamp = Date.now().toString(36);
  const organiser = await browser.newContext();
  const org = await organiser.newPage();

  // Organiser creates a crew with no account at all.
  await org.goto("/start");
  await org.fill('input[name="organiserName"]', "Sam Test");
  await org.fill('input[name="name"]', `E2E Crew ${stamp}`);
  await org.check('input[name="sport"][value="football"]');
  await org.click('button:has-text("Create crew")');
  await expect(org).toHaveURL(/\/crew\/e2e-crew-.*welcome=1/);
  await expect(org.getByText("Crew's live. Now get them in.")).toBeVisible();
  const inviteUrl = await readInvite(org);
  const slug = org.url().match(/\/crew\/([^/?]+)/)![1];

  // Pin a session for one hour from now, £20 split.
  await org.click('a:has-text("Pin a session")');
  await org.fill('input[name="title"]', "E2E 5s");
  // The form reads datetime-local as London wall-clock time, so build it in Europe/London.
  const startsAt = new Date(Date.now() + 3 * 60 * 60_000);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(startsAt);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  await org.fill('input[name="startsAt"]', `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`);
  await org.fill('input[name="venueName"]', "Test Pitch");
  await org.fill('input[name="capacity"]', "2");
  await org.fill('input[name="cost"]', "20");
  await org.check('input[name="costMode"][value="total"]');
  await org.click('button:has-text("Pin it")');
  await expect(org).toHaveURL(/\/s\/[a-z0-9]+\?pinned=1/);
  await expect(org.getByText("Pinned. Now send it.")).toBeVisible();
  const sessionUrl = org.url().split("?")[0];
  await expect(org.getByText("1/2")).toBeVisible();

  // Mate joins from the invite link, zero install, just a name.
  const mateCtx = await browser.newContext();
  const mate = await mateCtx.newPage();
  await mate.goto(inviteUrl);
  await expect(mate.getByText("You've been invited")).toBeVisible();
  await mate.fill('input[name="name"]', "Priya Test");
  await mate.click('button:has-text("Join")');
  await expect(mate).toHaveURL(new RegExp(`/crew/${slug}$`));

  // Mate taps in, session is now full.
  await mate.goto(sessionUrl);
  await mate.click('button:has-text("I\'m in")');
  await expect(mate.getByRole("button", { name: "You're in" })).toBeVisible();
  await expect(mate.getByText("2/2")).toBeVisible();

  // A third person joins and lands on the reserve list.
  const thirdCtx = await browser.newContext();
  const third = await thirdCtx.newPage();
  await third.goto(inviteUrl);
  await third.fill('input[name="name"]', "Deano Test");
  await third.click('button:has-text("Join")');
  await expect(third).toHaveURL(new RegExp(`/crew/${slug}$`));
  await third.goto(sessionUrl);
  await third.click('button:has-text("I\'m in")');
  await expect(third.getByText("you're on the reserve list", { exact: false })).toBeVisible();
  await expect(third.getByRole("button", { name: "On reserves" })).toBeVisible();

  // Mate drops out inside the 24h window: late drop, third gets promoted.
  await mate.reload();
  await mate.click('button:has-text("Can\'t make it")');
  await expect(mate.getByText("inside the late-drop window", { exact: false })).toBeVisible();
  await third.reload();
  await expect(third.getByRole("button", { name: "You're in" })).toBeVisible();

  // Organiser confirms who played: Sam and Deano turned up.
  await org.goto(`${sessionUrl}/play`);
  await expect(org.getByText("Late drops still owing a share: Priya")).toBeVisible();
  await org.click('button:has-text("Confirm and go to ratings")');
  await expect(org).toHaveURL(/\/rate$/);

  // Organiser rates: Deano player of the match.
  // Rating choices are tiles over visually hidden radios, so click the tile.
  await org.locator('label:has(input[name="cat_motm"])').first().click();
  await org.click('button:has-text("Submit votes")');
  await expect(org).toHaveURL(/rated=1/);
  await expect(org.getByText("Votes in. Nice one.")).toBeVisible();
  await expect(org.getByText("Deano Test").first()).toBeVisible();

  // Money: £20 split three ways (2 played + 1 late drop) = 6.67/6.67/6.66.
  await org.goto(`/crew/${slug}/money`);
  await expect(org.getByText("£20 charged", { exact: false })).toBeVisible();
  await expect(org.getByText("Owes £6.67").first()).toBeVisible();
  await expect(org.getByText("Settled")).toHaveCount(0);
  await org.locator('button:has-text("Paid up")').first().click();
  // The row pill and the "You" stat both flip to Settled.
  await expect(org.getByText("Settled")).toHaveCount(2);
  await expect(org.getByText("£6.67 paid", { exact: false })).toBeVisible();

  // Table: Deano top with 3 (turned up) + 2 (motm) = 5, Priya on -2 with a sick note.
  await org.goto(`/crew/${slug}/table`);
  const rows = org.locator("tbody tr");
  await expect(rows.first()).toContainText("Deano Test");
  await expect(rows.first()).toContainText("5");
  await expect(org.getByText("Sick note leaderboard")).toBeVisible();
  await expect(org.getByText("1 late · 0 no-show")).toBeVisible();

  // A stranger with the session link sees the poster and a join action, not a login wall.
  const anon = await browser.newContext();
  const stranger = await anon.newPage();
  await stranger.goto(sessionUrl);
  await expect(stranger.getByRole("heading", { level: 1 })).toContainText("E2E 5s");
  await expect(stranger.getByRole("link", { name: /Join .* to tap in/ })).toBeVisible();
  // Season awards exist once a session has been played.
  await org.goto(`/crew/${slug}/season`);
  await expect(org.getByRole("heading", { level: 1 })).toContainText("Season awards");
  await expect(org.getByText("Champion")).toBeVisible();

  // Share cards render as PNG without any cookie.
  const img = await anon.request.get(`${sessionUrl}/opengraph-image`);
  expect(img.ok()).toBeTruthy();
  expect(img.headers()["content-type"]).toContain("image/png");

  // Player card page and its image.
  await org.goto(`/crew/${slug}/table`);
  await org.click("tbody tr a >> nth=0");
  await expect(org).toHaveURL(/\/players\//);
  await expect(org.getByText("Share card")).toBeVisible();
  const card = await anon.request.get(`${org.url()}/opengraph-image`);
  expect(card.ok()).toBeTruthy();

  await organiser.close();
  await mateCtx.close();
  await thirdCtx.close();
  await anon.close();
});

test("landing, sign-in guard and 404 behave", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("turning up");
  await page.goto("/home");
  await expect(page).toHaveURL(/\/signin\?next=(%2F|\/)home/);
  const res = await page.goto("/crew/does-not-exist");
  expect(res?.status()).toBe(404);
});
