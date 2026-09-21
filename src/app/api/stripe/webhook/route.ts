import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDb, schema } from "@/db/client";
import { newId } from "@/lib/ids";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { refreshStripe } from "@/lib/actions/stripe";

/**
 * Stripe webhook. Records a card payment in the crew ledger exactly once (unique external ref),
 * and keeps the crew's charges_enabled flag current.
 */
export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Not configured", { status: 404 });
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("stripe webhook signature failed", e);
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object;
    const meta = cs.metadata ?? {};
    const share = Number(meta.sharePence);
    if (cs.payment_status === "paid" && meta.crewId && meta.userId && share > 0) {
      const db = await getDb();
      try {
        await db.insert(schema.ledger).values({
          id: newId(),
          crewId: meta.crewId,
          sessionId: meta.sessionId || null,
          userId: meta.userId,
          kind: "payment",
          amountPence: share,
          reason: "card",
          note: "Paid by card",
          externalRef: `stripe:${cs.id}`,
          createdBy: "stripe",
          createdAt: new Date(),
        });
      } catch (e) {
        // Unique external ref: a redelivered event is a no-op.
        if (!String(e).includes("UNIQUE")) throw e;
      }
    }
  }
  if (event.type === "account.updated") {
    const account = event.data.object;
    const crewId = account.metadata?.crewId;
    if (crewId) await refreshStripe(crewId);
  }
  return NextResponse.json({ received: true });
}
