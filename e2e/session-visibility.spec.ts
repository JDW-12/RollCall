import { test, expect, type Page } from "@playwright/test";

/**
 * Invite-only sessions, editing and deleting. An organiser pins a session for one mate only: that
 * mate sees it and taps in, the other mate can't see it anywhere (list, home, direct link). Then the
 * organiser opens it up to the crew, plays it, edits the played session's details, and deletes it.
 */

async function readInvite(page: Page): Promise<string> {
  const code = page.locator("code", { hasText: "/join/" }).first();
  await expect(code).toBeVisible();
  return (await code.textContent())!.trim();
}

function londonInput(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

test("invite-only session: picked mate sees it, the rest don't; edit when played; delete", async ({ browser }) => {
  const stamp = Date.now().toString(36);
  const org = await (await browser.newContext()).newPage();
  await org.goto("/start");
  await org.fill('input[name="organiserName"]', "Sam Vis");
  await org.fill('input[name="name"]', `Vis Crew ${stamp}`);
  await org.check('input[name="sport"][value="football"]');
  await org.click('button:has-text("Create crew")');
  await expect(org).toHaveURL(/welcome=1/);
  const inviteUrl = await readInvite(org);
  const slug = org.url().match(/\/crew\/([^/?]+)/)![1];

  const join = async (name: string) => {
    const p = await (await browser.newContext()).newPage();
    await p.goto(inviteUrl);
    await p.fill('input[name="name"]', name);
    await p.click('button:has-text("Join")');
    await expect(p).toHaveURL(new RegExp(`/crew/${slug}$`));
    return p;
  };
  const priya = await join("Priya Vis");
  const deano = await join("Deano Vis");

  // Pin it for Priya only. The invite list only appears once "Only people I pick" is chosen.
  await org.goto(`/crew/${slug}/sessions/new`);
  await org.fill('input[name="title"]', "Small sided");
  await org.fill('input[name="startsAt"]', londonInput(Date.now() + 3 * 3_600_000));
  await org.fill('input[name="venueName"]', "Test Pitch");
  await expect(org.getByRole("checkbox", { name: "Priya Vis" })).toBeHidden();
  await org.check('input[name="visibility"][value="picked"]');
  await org.getByRole("checkbox", { name: "Priya Vis" }).check();
  await org.click('button:has-text("Pin it")');
  await expect(org).toHaveURL(/\/s\/[a-z0-9]+\?pinned=1/);
  const sessionUrl = org.url().split("?")[0];
  await expect(org.getByText("Invite only").first()).toBeVisible();

  // Priya sees it and taps in.
  await priya.goto(`/crew/${slug}/sessions`);
  await expect(priya.getByText("Small sided")).toBeVisible();
  await priya.goto(sessionUrl);
  await priya.click('button:has-text("I\'m in")');
  await expect(priya.getByRole("button", { name: "You're in" })).toBeVisible();

  // Deano can't see it: not on the list, not on home, and the link says invite only.
  await deano.goto(`/crew/${slug}/sessions`);
  await expect(deano.getByText("Small sided")).toHaveCount(0);
  await deano.goto(`/crew/${slug}`);
  await expect(deano.getByText("Small sided")).toHaveCount(0);
  await deano.goto(sessionUrl);
  await expect(deano.getByText("Invite only")).toBeVisible();
  await expect(deano.getByText("Test Pitch")).toHaveCount(0);

  // Organiser opens it to the whole crew; now Deano sees it.
  await org.goto(`${sessionUrl}/edit`);
  await org.check('input[name="visibility"][value="crew"]');
  await org.click('button:has-text("Save changes")');
  await expect(org).toHaveURL(sessionUrl);
  await deano.goto(`/crew/${slug}/sessions`);
  await expect(deano.getByText("Small sided")).toBeVisible();

  // Played sessions can still be edited: the details change, spots and cost are locked.
  await org.goto(`${sessionUrl}/play`);
  await org.click('button:has-text("Confirm and go to ratings")');
  await expect(org).toHaveURL(/\/rate$/);
  await org.goto(sessionUrl);
  await org.getByRole("link", { name: "Edit or delete" }).click();
  await expect(org.getByText("Spots and cost are settled once it's played", { exact: false })).toBeVisible();
  await expect(org.locator('input[name="capacity"]')).toHaveCount(0);
  await org.fill('input[name="title"]', "Small sided (rain)");
  await org.click('button:has-text("Save changes")');
  await expect(org).toHaveURL(sessionUrl);
  await expect(org.getByRole("heading", { name: "Small sided (rain)" })).toBeVisible();

  // Delete: needs the confirm tick, then it's gone for everyone.
  await org.goto(`${sessionUrl}/edit`);
  const danger = org.getByRole("region", { name: "Danger zone" });
  await danger.getByLabel("Yes, delete this", { exact: false }).check();
  await danger.getByRole("button", { name: /Delete/ }).click();
  await expect(org).toHaveURL(new RegExp(`/crew/${slug}/sessions\\?deleted=1`));
  await expect(org.getByText("Small sided (rain)")).toHaveCount(0);
  const gone = await priya.goto(sessionUrl);
  expect(gone?.status()).toBe(404);
});
