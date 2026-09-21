"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db/client";
import { requireCrewAction } from "@/lib/access";
import { appUrl } from "@/lib/env";
import { feeConfig, stripe, stripeConfigured } from "@/lib/stripe";
import { cardTotal } from "@/domain/fees";
import { getCrewLedger } from "@/lib/queries";
import { act, str, uiError, type ActionState } from "./shared";

/** Organiser: create (or resume) the crew's Express account and go to Stripe's hosted onboarding. */
export async function connectStripe(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await act(async () => {
    if (!stripeConfigured()) uiError("Card payments aren't switched on for this server yet.");
    const { crew, user } = await requireCrewAction(str(fd, "crewId"), { organiser: true });
    const s = stripe();
    const db = await getDb();
    let accountId = crew.stripeAccountId;
    if (!accountId) {
      const account = await s.accounts.create({
        type: "express",
        country: "GB",
        email: user.email ?? undefined,
        business_type: "individual",
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { product_description: `Session costs for ${crew.name} on Roll Call`, mcc: "7941" },
        metadata: { crewId: crew.id, crewName: crew.name },
      });
      accountId = account.id;
      await db.update(schema.crews).set({ stripeAccountId: accountId }).where(eq(schema.crews.id, crew.id));
    }
    const base = await appUrl();
    const link = await s.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${base}/crew/${crew.slug}/settings?stripe=refresh`,
      return_url: `${base}/crew/${crew.slug}/settings?stripe=return`,
    });
    target = link.url;
  });
  if (r.error) return r;
  redirect(target);
}

/** Pull the latest account status from Stripe. Called on return from onboarding and from a button. */
export async function refreshStripe(crewId: string): Promise<void> {
  if (!stripeConfigured()) return;
  const db = await getDb();
  const crew = (await db.select().from(schema.crews).where(eq(schema.crews.id, crewId)).limit(1))[0];
  if (!crew?.stripeAccountId) return;
  try {
    const account = await stripe().accounts.retrieve(crew.stripeAccountId);
    await db.update(schema.crews).set({ stripeChargesEnabled: !!account.charges_enabled }).where(eq(schema.crews.id, crew.id));
  } catch (e) {
    console.error("stripe refresh failed", e);
  }
}

export async function refreshStripeAction(fd: FormData): Promise<void> {
  const { crew } = await requireCrewAction(str(fd, "crewId"), { organiser: true });
  await refreshStripe(crew.id);
  revalidatePath(`/crew/${crew.slug}/settings`);
}

/**
 * Member: pay what they owe the crew by card. A destination charge to the crew's account with the
 * Roll Call fee on top as the application fee; the crew's share arrives whole and Roll Call never holds it.
 */
export async function startCardPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await act(async () => {
    if (!stripeConfigured()) uiError("Card payments aren't switched on for this server yet.");
    const { crew, user } = await requireCrewAction(str(fd, "crewId"));
    if (!crew.stripeAccountId || !crew.stripeChargesEnabled) uiError("This crew hasn't set up card payments yet. Ask your organiser.");
    const sessionId = str(fd, "sessionId") || null;
    const { balances } = await getCrewLedger(crew.id);
    const owed = balances.get(user.id)?.owed ?? 0;
    if (owed <= 0) uiError("You're settled up. Nothing to pay.");
    const { share, fee, total } = cardTotal(owed, feeConfig());
    const base = await appUrl();
    const back = sessionId ? `${base}/crew/${crew.slug}/s/${sessionId}` : `${base}/crew/${crew.slug}/money`;
    const checkout = await stripe().checkout.sessions.create({
      mode: "payment",
      currency: "gbp",
      line_items: [
        { quantity: 1, price_data: { currency: "gbp", unit_amount: share, product_data: { name: `${crew.name}: your share` } } },
        { quantity: 1, price_data: { currency: "gbp", unit_amount: fee, product_data: { name: "Roll Call fee" } } },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: crew.stripeAccountId },
        on_behalf_of: crew.stripeAccountId,
        metadata: { crewId: crew.id, userId: user.id, sessionId: sessionId ?? "", sharePence: String(share) },
      },
      metadata: { crewId: crew.id, userId: user.id, sessionId: sessionId ?? "", sharePence: String(share) },
      customer_email: user.email ?? undefined,
      success_url: `${back}?paid=1`,
      cancel_url: back,
    });
    if (!checkout.url) uiError("Stripe didn't return a checkout page. Try again.");
    target = checkout.url;
    void total;
  });
  if (r.error) return r;
  redirect(target);
}
