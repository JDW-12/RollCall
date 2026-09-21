import { test, expect } from "@playwright/test";
import Stripe from "stripe";

/**
 * Proves the webhook path with a genuinely signed Stripe event: the ledger records the payment once,
 * a redelivered event is ignored, and a bad signature is rejected.
 */
test("signed checkout.session.completed is recorded exactly once", async ({ browser }) => {
  const secret = "whsec_e2e_dummy";
  const stamp = Date.now().toString(36);
  const ctx = await browser.newContext();
  const org = await ctx.newPage();

  await org.goto("/start");
  await org.fill('input[name="organiserName"]', "Josh Pay");
  await org.fill('input[name="name"]', `Pay Crew ${stamp}`);
  await org.click('button:has-text("Create crew")');
  await expect(org).toHaveURL(/\/crew\//);
  const slug = org.url().match(/\/crew\/([^/?]+)/)![1];
  const crewId = await org.locator("main").getAttribute("data-crew");
  const userId = await org.locator("main").getAttribute("data-user");
  expect(crewId && userId).toBeTruthy();

  // Pin, play and confirm a £20 per-head session so a charge exists.
  await org.goto(`/crew/${slug}/sessions/new`);
  await org.fill('input[name="title"]', "Pay test");
  const startsAt = new Date(Date.now() + 3 * 60 * 60_000);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(startsAt);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  await org.fill('input[name="startsAt"]', `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`);
  await org.fill('input[name="capacity"]', "2");
  await org.fill('input[name="cost"]', "20");
  await org.check('input[name="costMode"][value="per_head"]');
  await org.click('button:has-text("Pin it")');
  await expect(org).toHaveURL(/\/s\/[a-z0-9]+/);
  const sessionId = org.url().match(/\/s\/([a-z0-9]+)/)![1];
  await org.goto(`/crew/${slug}/s/${sessionId}/play`);
  await org.click('button:has-text("Confirm and go to ratings")');
  await org.goto(`/crew/${slug}/money`);
  await expect(org.getByText("Owes £20")).toBeVisible();

  const event = {
    id: `evt_${stamp}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: `cs_test_${stamp}`, object: "checkout.session", payment_status: "paid", metadata: { crewId, userId, sessionId, sharePence: "2000" } } },
  };
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });

  const bad = await ctx.request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad" } });
  expect(bad.status()).toBe(400);

  const ok = await ctx.request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": header } });
  expect(ok.status()).toBe(200);
  const again = await ctx.request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": header } });
  expect(again.status()).toBe(200);

  await org.goto(`/crew/${slug}/money`);
  await expect(org.getByText("Settled")).toHaveCount(2);
  await expect(org.getByText("£20 charged · £20 paid")).toBeVisible();
  await expect(org.getByText("of £20 charged")).toBeVisible();
  await org.getByText("Every entry", { exact: false }).click();
  await expect(org.getByText("paid by card")).toBeVisible();
  await ctx.close();
});
