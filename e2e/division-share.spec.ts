import { test, expect, type Page } from "@playwright/test";

/**
 * The point of sharing tables: the second crew in a division never sources one.
 *
 * Crew A pastes their league table once. Crew B, who has never touched the league settings, plays
 * three teams from that division. Roll Call recognises the division from those opponents alone and
 * offers Crew B the table; one tap and they have it.
 */

function londonInput(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

async function makeCrew(page: Page, organiser: string, name: string): Promise<string> {
  await page.goto("/start");
  await page.fill('input[name="organiserName"]', organiser);
  await page.fill('input[name="name"]', name);
  await page.check('input[name="sport"][value="football"]');
  await page.click('button:has-text("Create crew")');
  await expect(page).toHaveURL(/\/crew\/.*welcome=1/);
  return page.url().match(/\/crew\/([^/?]+)/)![1];
}

async function addCompetition(page: Page, slug: string, name: string, teamName: string) {
  await page.goto(`/crew/${slug}/settings`);
  const form = page.locator("form[data-competition-form]").first();
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="teamName"]').fill(teamName);
  await form.locator('button:has-text("Add competition")').click();
  await expect(page.locator("details", { hasText: name }).first()).toBeVisible();
}

async function pinFixture(page: Page, slug: string, opponent: string, hoursAgo: number) {
  await page.goto(`/crew/${slug}/sessions/new`);
  await page.fill('input[name="title"]', `v ${opponent}`);
  await page.fill('input[name="opponent"]', opponent);
  await page.fill('input[name="startsAt"]', londonInput(Date.now() - hoursAgo * 60 * 60_000));
  await page.fill('input[name="capacity"]', "5");
  await page.click('button:has-text("Pin it")');
  await expect(page).toHaveURL(/\/s\/[a-z0-9]+\?pinned=1/);
}

test("divisions: one crew's table serves the next crew in the league", async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString(36);
  const wickName = `Wick Athletic ${stamp}`;
  const tuesdayName = `Tuesday FC ${stamp}`;
  const rovers = `Road Rovers ${stamp}`;
  const rangers = `Bow Rangers ${stamp}`;

  // Crew A sources the table, the only time anyone does.
  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  const slugA = await makeCrew(a, "Alex Test", wickName);
  await addCompetition(a, slugA, "Sunday Division 3", wickName);

  const rowA = a.locator("details", { hasText: "Sunday Division 3" }).first();
  await rowA.locator("summary").first().click();
  const standings = a.locator("form[data-standings-form]").first();
  // Pasted the way a manager actually does it: the whole page, navigation and footer included.
  await standings.locator("textarea[name=table]").fill(
    [
      "Hackney & Leyton Sunday League",
      "Home Fixtures Results Tables",
      "Division 3 — Season 2026/27",
      "Pos Team P W D L F A GD Pts",
      `1 ${wickName} 10 8 1 1 32 12 20 25`,
      `2 ${tuesdayName} 10 7 2 1 28 14 14 23`,
      `3 ${rovers} 10 5 2 3 20 17 3 17`,
      `4 ${rangers} 10 1 1 8 9 30 -21 4`,
      "Sponsored by Greggs",
      "© The Football Association 2026",
    ].join("\n"),
  );
  await standings.locator('button:has-text("Paste the table")').click();
  await expect(rowA).toContainText("Table in");

  // Crew B never opens the league settings beyond naming the division: no link, no snippet, no paste.
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  const slugB = await makeCrew(b, "Bev Test", tuesdayName);
  await addCompetition(b, slugB, "Our Sunday league", tuesdayName);

  // With nothing to go on yet, they are told they are first.
  await b.goto(`/crew/${slugB}/league`);
  await expect(b.getByText("Nobody has sourced this division yet")).toBeVisible();

  // Three fixtures against teams from that division is enough of a fingerprint.
  await pinFixture(b, slugB, rovers, 72);
  await pinFixture(b, slugB, rangers, 48);
  await pinFixture(b, slugB, wickName, 24);

  await b.goto(`/crew/${slugB}/league`);
  await expect(b.getByText("We've already got this one")).toBeVisible();
  await expect(b.getByText("Sunday Division 3")).toBeVisible();
  await b.locator('form[data-adopt-division] button:has-text("That\'s our division")').click();

  // The table is now theirs, credited to the crew that did the work, with their row picked out.
  await expect(b.getByText(`Shared by ${wickName}`)).toBeVisible();
  const table = b.locator("table").first();
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await expect(table.locator("tbody tr").nth(1)).toContainText(tuesdayName);
  // Crew B never pasted anything, so no "Refresh" or organiser feed controls belong to them here.
  await expect(b.locator("form[data-refresh-standings]")).toHaveCount(0);

  // And it survives a reload: the two crews are joined, not copied.
  await b.reload();
  await expect(b.getByText(`Shared by ${wickName}`)).toBeVisible();
});
