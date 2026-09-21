import "server-only";
import Stripe from "stripe";
import { DEFAULT_FEE, type FeeConfig } from "@/domain/fees";

/** Card payments are on only when a secret key is present. Everything else degrades to "mark as paid". */
export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function feeConfig(): FeeConfig {
  const bps = Number(process.env.PLATFORM_FEE_BPS);
  const fixed = Number(process.env.PLATFORM_FEE_FIXED_PENCE);
  return {
    bps: Number.isFinite(bps) && bps >= 0 ? bps : DEFAULT_FEE.bps,
    fixedPence: Number.isFinite(fixed) && fixed >= 0 ? fixed : DEFAULT_FEE.fixedPence,
  };
}
