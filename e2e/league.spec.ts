import { test, expect } from "@playwright/test";

/**
 * The club hub, as a manager would use it: link the league, paste the table off the league site,
 * pin a fixture against an opponent, confirm who played, enter the result and who did what, then
 * find the lot gathered on the League tab.
 */

function londonInput(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

test("league: link → table → fixture → result → hub", async ({ browser }) => {
  test.setTimeout(150_000);
  const stamp = Date.now().toString(36);
  const ctx = await browser.newContext();
  const org = await ctx.newPage();

  await org.goto("/start");
  await org.fill('input[name="organiserName"]', "Josh Test");
  await org.fill('input[name="name"]', `E2E Athletic ${stamp}`);
  await org.check('input[name="sport"][value="football"]');
  await org.click('button:has-text("Create crew")');
  await expect(org).toHaveURL(/\/crew\/e2e-athletic-.*welcome=1/);
  const slug = org.url().match(/\/crew\/([^/?]+)/)![1];

  // Football gets a League tab; with nothing linked it offers the finders.
  await org.goto(`/crew/${slug}/league`);
  await expect(org.getByText("No league linked")).toBeVisible();
  await expect(org.getByRole("link", { name: /FA Full-Time/ })).toBeVisible();

  // Link the division, then paste the table straight off the league page.
  await org.goto(`/crew/${slug}/settings`);
  const comp = org.locator("form[data-competition-form]").first();
  await comp.locator('input[name="name"]').fill("Division 3");
  await comp.locator('input[name="externalUrl"]').fill("https://fulltime.thefa.com/displayTeam.html?teamID=42");
  await comp.locator('input[name="teamName"]').fill("E2E Athletic");
  await comp.locator('button:has-text("Add competition")').click();
  // The add panel folds away once it is saved, so look for the competition in the list instead.
  const row = org.locator("details", { hasText: "Division 3" }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("FA Full-Time");
  await row.locator("summary").first().click();

  const standings = org.locator("form[data-standings-form]").first();
  await standings.locator("textarea[name=table]").fill(
    ["Pos\tTeam\tP\tW\tD\tL\tF\tA\tGD\tPts", "1\tHackney Wick FC\t10\t8\t1\t1\t32\t12\t20\t25", "2\tE2E Athletic\t10\t7\t2\t1\t28\t14\t14\t23", "3\tRovers\t10\t1\t1\t8\t9\t30\t-21\t4"].join("\n"),
  );
  await standings.locator('button:has-text("Paste the table")').click();
  await expect(row).toContainText("Table in");

  // Pin a fixture: competition, opponent, home.
  await org.goto(`/crew/${slug}/sessions/new`);
  await org.fill('input[name="title"]', "Sunday league");
  await org.selectOption('select[name="competitionId"]', { label: "Division 3" });
  await org.fill('input[name="opponent"]', "Rovers");
  await org.locator('label:has(input[name="homeAway"][value="home"])').click();
  await org.fill('input[name="startsAt"]', londonInput(Date.now() - 3 * 60 * 60_000));
  await org.fill('input[name="capacity"]', "5");
  await org.click('button:has-text("Pin it")');
  await expect(org).toHaveURL(/\/s\/[a-z0-9]+\?pinned=1/);
  const sessionUrl = org.url().split("?")[0];

  // Confirm the organiser played, then enter the result and the numbers.
  await org.goto(`${sessionUrl}/play`);
  await org.click('button:has-text("Confirm and go to ratings")');
  await org.goto(sessionUrl);
  const result = org.locator("form[data-result-form]");
  await expect(org.getByText("v Rovers (H)")).toBeVisible();
  await result.locator('input[aria-label="Our score"]').fill("3");
  await result.locator('input[aria-label="Their score"]').fill("1");
  await result.locator('input[aria-label="Josh Test: goals"]').fill("2");
  await result.locator('input[aria-label="Josh Test: assists"]').fill("1");
  await result.locator('input[aria-label="Josh Test: manager rating out of ten"]').fill("9");
  await result.locator('button:has-text("Save the result")').click();
  // The entry form folds away once the score is in; the scoreline above it is the confirmation.
  await expect(org.getByText("E2E Athletic 3–1 Rovers")).toBeVisible();
  await expect(org.getByText("2 goals · 1 assist · 9/10")).toBeVisible();

  // The hub: our record, the pasted table with our row highlighted, the result and the player stats.
  await org.goto(`/crew/${slug}/league`);
  await expect(org.getByRole("heading", { name: "Division 3" })).toBeVisible();
  await expect(org.getByRole("link", { name: /Open it on FA Full-Time/ })).toBeVisible();
  const record = org.locator("section,div").filter({ hasText: "Played" }).first();
  await expect(record).toBeVisible();
  await expect(org.getByLabel("Form, newest first: W")).toBeVisible();

  const table = org.locator("table").first();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(table.locator("tbody tr").nth(1)).toContainText("E2E Athletic");
  await expect(table.locator("tbody tr").nth(2)).toContainText("-21");

  await expect(org.getByText("E2E Athletic 3–1 Rovers")).toBeVisible();
  await expect(org.getByText("Top scorer")).toBeVisible();
  const players = org.locator("table").last();
  await expect(players.locator("tbody tr").first()).toContainText("Josh Test");

  // A member sees the result without being able to change it.
  const mateCtx = await browser.newContext();
  const mate = await mateCtx.newPage();
  await org.goto(`/crew/${slug}/settings`);
  const invite = (await org.locator("code", { hasText: "/join/" }).first().textContent())!.trim();
  await mate.goto(invite);
  await mate.fill('input[name="name"]', "Priya Test");
  await mate.click('button:has-text("Join")');
  await expect(mate).toHaveURL(new RegExp(`/crew/${slug}$`));
  await mate.goto(sessionUrl);
  await expect(mate.getByText("E2E Athletic 3–1 Rovers")).toBeVisible();
  await expect(mate.locator("form[data-result-form]")).toHaveCount(0);
});
